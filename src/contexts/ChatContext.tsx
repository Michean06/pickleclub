'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  file_url?: string;
  file_metadata?: Record<string, any>;
  reply_to_id?: string;
  status: string;
  read_by: string[];
  reactions: Record<string, string[]>;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  reply_to?: {
    id: string;
    content: string;
    sender_id: string;
  };
}

interface Conversation {
  id: string;
  title?: string;
  type: string;
  created_by: string;
  reservation_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  members?: Array<{
    user_id: string;
    role: string;
    last_read_at?: string;
    users?: {
      id: string;
      name: string;
      avatar_url?: string;
    };
  }>;
  last_message?: Message;
}

interface TypingUser {
  user_id: string;
  conversation_id: string;
  is_typing: boolean;
  updated_at: string;
  users?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Record<string, Message[]>;
  typingStatus: Record<string, TypingUser[]>;
  loading: boolean;
  setActiveConversation: (conversation: Conversation | null) => void;
  fetchConversations: () => Promise<void>;
  sendMessage: (conversationId: string, content: string, fileUrl?: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  updateTypingStatus: (conversationId: string, isTyping: boolean) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [typingStatus, setTypingStatus] = useState<Record<string, TypingUser[]>>({});
  const [loading, setLoading] = useState(false);
  const channelsRef = React.useRef<Map<string, any>>(new Map());

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_members!inner(user_id),
          messages(count)
        `)
        .eq('conversation_members.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(id, name, avatar_url),
          reply_to:messages(id, content, sender_id)
        `)
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(prev => ({ ...prev, [conversationId]: data || [] }));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  const subscribeToConversation = useCallback((conversationId: string) => {
    if (channelsRef.current.has(conversationId)) {
      console.log('Already subscribed to conversation:', conversationId);
      return;
    }

    console.log('Subscribing to conversation:', conversationId);

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          setMessages(prev => {
            const existing = prev[conversationId] || [];
            const exists = existing.some(msg => msg.id === payload.new.id);
            if (exists) {
              return prev;
            }
            return {
              ...prev,
              [conversationId]: [...existing, payload.new as Message]
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Message updated:', payload);
          setMessages(prev => ({
            ...prev,
            [conversationId]: prev[conversationId]?.map(msg =>
              msg.id === payload.new.id ? payload.new as Message : msg
            ) || []
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Message deleted:', payload);
          setMessages(prev => ({
            ...prev,
            [conversationId]: prev[conversationId]?.filter(msg => msg.id !== payload.old.id) || []
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Typing status changed:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setTypingStatus(prev => {
              const users = prev[conversationId]?.filter(u => u.user_id !== payload.new.user_id) || [];
              if (payload.new.is_typing) {
                return { ...prev, [conversationId]: [...users, payload.new as TypingUser] };
              }
              return { ...prev, [conversationId]: users };
            });
          } else if (payload.eventType === 'DELETE') {
            setTypingStatus(prev => ({
              ...prev,
              [conversationId]: prev[conversationId]?.filter(u => u.user_id !== payload.old.user_id) || []
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to conversation:', conversationId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for conversation:', conversationId);
        }
      });

    channelsRef.current.set(conversationId, channel);
  }, []);

  const unsubscribeFromConversation = useCallback((conversationId: string) => {
    const channel = channelsRef.current.get(conversationId);
    if (channel) {
      supabase.removeChannel(channel);
      channelsRef.current.delete(conversationId);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string, fileUrl?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Sending message:', { conversationId, content, userId: user.id });

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: fileUrl ? 'file' : 'text',
          file_url: fileUrl
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      console.log('Message sent successfully:', data);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('mark_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error marking as read:', error);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, []);

  const updateTypingStatus = useCallback(async (conversationId: string, isTyping: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('typing_status')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_typing: isTyping,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }, []);

  // Subscribe to conversations changes
  React.useEffect(() => {
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConversations(prev => [payload.new as Conversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev =>
              prev.map(conv => conv.id === payload.new.id ? payload.new as Conversation : conv)
            );
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev => prev.filter(conv => conv.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
      channelsRef.current.clear();
    };
  }, []);

  // Fetch messages when active conversation changes
  React.useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
      subscribeToConversation(activeConversation.id);
    }

    return () => {
      if (activeConversation) {
        unsubscribeFromConversation(activeConversation.id);
      }
    };
  }, [activeConversation, fetchMessages, subscribeToConversation, unsubscribeFromConversation]);

  const value: ChatContextType = {
    conversations,
    activeConversation,
    messages,
    typingStatus,
    loading,
    setActiveConversation,
    fetchConversations,
    sendMessage,
    markAsRead,
    updateTypingStatus
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
