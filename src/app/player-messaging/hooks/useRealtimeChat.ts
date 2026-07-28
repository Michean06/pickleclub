'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  isOwn: boolean;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
}

interface UseRealtimeChatOptions {
  conversationId: string | null;
  currentUserId: string | null;
  onMessagesChanged?: () => void;
}

const toMessage = (row: MessageRow, currentUserId: string): Message => ({
  id: row.id,
  sender_id: row.sender_id,
  text: row.text,
  created_at: row.created_at,
  status: row.status,
  isOwn: row.sender_id === currentUserId,
});

export function useRealtimeChat({
  conversationId,
  currentUserId,
  onMessagesChanged,
}: UseRealtimeChatOptions) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const changedRef = useRef(onMessagesChanged);
  changedRef.current = onMessagesChanged;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const upsertMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      const existing = prev.findIndex((m) => m.id === message.id);
      if (existing === -1) return [...prev, message];
      const next = [...prev];
      next[existing] = { ...next[existing], ...message };
      return next;
    });
  }, []);

  const markAsRead = useCallback(
    async (id: string, userId: string) => {
      const { error } = await supabase.rpc('mark_messages_as_read', {
        conversation_id: id,
        user_id: userId,
      });
      if (error) {
        console.error('[useRealtimeChat] mark_messages_as_read error:', error);
        return;
      }
      changedRef.current?.();
    },
    [supabase]
  );

  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (cancelled) return;
      setLoading(false);

      if (error) {
        console.error('[useRealtimeChat] load messages error:', error);
        return;
      }

      setMessages((data ?? []).map((row: MessageRow) => toMessage(row, currentUserId)));
      await markAsRead(conversationId, currentUserId);
    };

    loadMessages();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          upsertMessage(toMessage(payload.new as MessageRow, currentUserId));
          changedRef.current?.();
          if ((payload.new as MessageRow).sender_id !== currentUserId) {
            markAsRead(conversationId, currentUserId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => upsertMessage(toMessage(payload.new as MessageRow, currentUserId))
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase, upsertMessage, markAsRead]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || !conversationId || !currentUserId) return false;

      const { data: messageId, error } = await supabase.rpc('send_message', {
        conversation_id: conversationId,
        sender_id: currentUserId,
        message_text: text,
      });

      if (error || !messageId) {
        console.error('[useRealtimeChat] send_message error:', error);
        return false;
      }

      // Optimistic append; the realtime INSERT event upserts the same id.
      upsertMessage({
        id: messageId as string,
        sender_id: currentUserId,
        text,
        created_at: new Date().toISOString(),
        status: 'sent',
        isOwn: true,
      });
      changedRef.current?.();
      return true;
    },
    [conversationId, currentUserId, supabase, upsertMessage]
  );

  return { messages, loading, sendMessage, messagesEndRef };
}
