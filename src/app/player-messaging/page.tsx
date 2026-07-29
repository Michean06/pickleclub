'use client';

import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Search, Send, MoreVertical, Phone, Video, ChevronLeft, CheckCheck, Check, Smile, Paperclip, Pin, Archive, BellOff, Trash2, Users, MessageSquarePlus, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCall } from '@/contexts/CallContext';

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  isOwn: boolean;
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  avatarUrl: string | null;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
  skill: string;
  pinned?: boolean;
  muted?: boolean;
  messages: Message[];
  otherUserId?: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  player_id: string;
  skill_level: string;
  avatar_url: string;
}


const skillColors: Record<string, string> = {
  Pro: 'bg-amber-100 text-amber-700',
  Advanced: 'bg-blue-100 text-blue-700',
  Intermediate: 'bg-green-100 text-green-700',
  Group: 'bg-purple-100 text-purple-700',
};

const avatarColors = ['gradient-green', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];

export default function PlayerMessagingPage() {
  const supabase = createClient();
  const { initiateCall } = useCall();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Global subscription for all conversations
  useEffect(() => {
    if (!currentUser) return;

    console.log('Setting up global message subscription for user:', currentUser.id);

    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('Global: New message received:', payload);
          
          // Check if user is a member of this conversation
          const { data: member } = await supabase
            .from('conversation_members')
            .select('conversation_id')
            .eq('conversation_id', payload.new.conversation_id)
            .eq('user_id', currentUser.id)
            .single();

          if (member) {
            console.log('User is member of conversation, reloading conversations');
            // Reload conversations to update last message and unread counts
            loadConversations();
            
            // If this is the active conversation, add the message
            if (activeConv?.id === payload.new.conversation_id) {
              const newMsg: Message = {
                id: payload.new.id,
                sender_id: payload.new.sender_id,
                text: payload.new.text,
                created_at: payload.new.created_at,
                status: payload.new.status,
                isOwn: payload.new.sender_id === currentUser.id,
              };
              setMessages((prev) => {
                const exists = prev.some(msg => msg.id === newMsg.id);
                if (exists) return prev;
                return [...prev, newMsg];
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Global subscription status:', status);
      });

    return () => {
      console.log('Cleaning up global subscription');
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }

    // Subscribe to conversation_members changes for realtime unread count updates
    const membersChannel = supabase
      .channel('conversation-members-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${currentUser?.id}`
        },
        (payload) => {
          console.log('Conversation member updated:', payload);
          // Reload conversations to update unread counts
          loadConversations();
        }
      )
      .subscribe((status) => {
        console.log('Conversation members subscription status:', status);
      });

    return () => {
      supabase.removeChannel(membersChannel);
    };
  }, [currentUser]);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      subscribeToMessages(activeConv.id);
    }

    return () => {
      if (activeConv) {
        unsubscribeFromMessages();
      }
    };
  }, [activeConv]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser({ id: user.id });
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    console.log('Subscribing to messages for conversation:', conversationId);
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message received via realtime:', payload);
          if (activeConv?.id === conversationId) {
            const newMsg: Message = {
              id: payload.new.id,
              sender_id: payload.new.sender_id,
              text: payload.new.text,
              created_at: payload.new.created_at,
              status: payload.new.status,
              isOwn: payload.new.sender_id === currentUser?.id,
            };
            setMessages((prev) => {
              const exists = prev.some(msg => msg.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
          }
          // Reload conversations to update last message
          loadConversations();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to realtime messages');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime channel error');
        }
      });

    channelRef.current = channel;
  };

  const unsubscribeFromMessages = () => {
    if (channelRef.current) {
      console.log('Unsubscribing from messages');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  const loadConversations = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          pinned,
          muted,
          last_read_at,
          conversations (
            id,
            type,
            name,
            updated_at
          )
        `)
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false, referencedTable: 'conversations' });

      if (participantData) {
        const conversationPromises = participantData.map(async (participant: any) => {
          const conv = participant.conversations;
          
          // Get other participants for direct messages
          const { data: otherParticipants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', currentUser.id);

          const otherUserId = otherParticipants?.[0]?.user_id;
          
          // Get other user's profile
          let userProfile = null;
          if (otherUserId) {
            const { data } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', otherUserId)
              .single();
            userProfile = data;
          }

          // Get last message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .gt('created_at', participant.last_read_at || new Date(0).toISOString())
            .neq('sender_id', currentUser.id);

          return {
            id: conv.id,
            name: conv.type === 'group' ? conv.name : userProfile?.full_name || 'Unknown',
            avatar: conv.type === 'group' ? 'Group' : userProfile?.avatar_url || getInitials(userProfile?.full_name || 'Unknown'),
            avatarUrl: conv.type === 'group' ? null : userProfile?.avatar_url || null,
            lastMessage: lastMessageData?.[0]?.text || 'No messages yet',
            timestamp: formatTimestamp(conv.updated_at),
            unread: unreadCount || 0,
            online: false, // TODO: Implement online status
            skill: conv.type === 'group' ? 'Group' : capitalize(userProfile?.skill_level || 'beginner'),
            pinned: participant.pinned,
            muted: participant.muted,
            messages: [],
            otherUserId,
          };
        });

        const loadedConversations = await Promise.all(conversationPromises);
        setConversations(loadedConversations);
        
        if (loadedConversations.length > 0 && !activeConv) {
          setActiveConv(loadedConversations[0]);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (!currentUser) return;
    
    try {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesData) {
        const formattedMessages = messagesData.map((msg: any) => ({
          id: msg.id,
          sender_id: msg.sender_id,
          text: msg.text,
          created_at: msg.created_at,
          status: msg.status,
          isOwn: msg.sender_id === currentUser.id,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const searchPlayers = async (query: string) => {
    if (!query.trim() || !currentUser) {
      setSearchResults([]);
      return;
    }
    
    setSearchingPlayers(true);
    try {
      // Search by name (case-insensitive partial match)
      const { data: nameResults } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('full_name', `%${query}%`)
        .neq('id', currentUser.id)
        .limit(10);
      
      // Also search by exact player_id if it looks like an ID
      const { data: idResults } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('player_id', query)
        .neq('id', currentUser.id)
        .limit(10);
      
      // Combine results, removing duplicates
      const combined = [...(nameResults || []), ...(idResults || [])];
      const uniqueResults = combined.filter((player, index, self) =>
        index === self.findIndex((p) => p.id === player.id)
      );
      
      setSearchResults(uniqueResults);
    } catch (error) {
      console.error('Error searching players:', error);
      setSearchResults([]);
    } finally {
      setSearchingPlayers(false);
    }
  };

  const startConversation = async (otherUserId: string) => {
    if (!currentUser) return;
    
    try {
      // Get the other user's profile first
      const { data: otherUserProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();
      
      const { data: convId } = await supabase.rpc('get_or_create_direct_conversation', {
        user1_id: currentUser.id,
        user2_id: otherUserId,
      });
      
      if (convId) {
        // Create a temporary conversation object to show immediately
        const tempConversation = {
          id: convId,
          name: otherUserProfile?.full_name || 'Unknown',
          avatar: otherUserProfile?.avatar_url || getInitials(otherUserProfile?.full_name || 'Unknown'),
          avatarUrl: otherUserProfile?.avatar_url || null,
          lastMessage: 'No messages yet',
          timestamp: 'Just now',
          unread: 0,
          online: false,
          pinned: false,
          muted: false,
          skill: 'Beginner',
          messages: [],
          otherUserId: otherUserId
        };
        
        setActiveConv(tempConversation);
        setMobileView('chat');
        
        // Then reload conversations in the background
        await loadConversations();
        
        // Update with the real conversation data if available
        const realConv = conversations.find(c => c.id === convId);
        if (realConv) {
          setActiveConv(realConv);
        }
        
        setShowPlayerSearch(false);
        setPlayerSearchQuery('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const filteredConvs = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filteredConvs.filter((c) => c.pinned);
  const unpinned = filteredConvs.filter((c) => !c.pinned);

  const handleSelectConv = async (conv: Conversation) => {
    setActiveConv(conv);
    setMessages(conv.messages);
    setMobileView('chat');
    setShowMenu(false);

    // Mark messages as read via RPC
    if (currentUser) {
      try {
        const { error } = await supabase.rpc('mark_messages_as_read', {
          p_conversation_id: conv.id,
          p_user_id: currentUser.id,
        });

        if (error) {
          console.error('[PlayerMessaging] mark_messages_as_read error:', error);
        } else {
          console.log('[PlayerMessaging] Messages marked as read successfully');
          // Clear unread count for this conversation immediately
          setConversations(prev =>
            prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c)
          );
          // Reload conversations to ensure database state is reflected
          await loadConversations();
        }
      } catch (error) {
        console.error('[PlayerMessaging] Error marking as read:', error);
      }
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !activeConv || !currentUser) return;
    
    try {
      const { data: messageId } = await supabase.rpc('send_message', {
        conversation_id: activeConv.id,
        sender_id: currentUser.id,
        message_text: text,
      });
      
      if (messageId) {
        const newMsg: Message = {
          id: messageId,
          sender_id: currentUser.id,
          text,
          created_at: new Date().toISOString(),
          status: 'sent',
          isOwn: true,
        };
        setMessages((prev) => [...prev, newMsg]);
        setInputText('');
        inputRef.current?.focus();
        
        // Reload conversations to update last message
        await loadConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-0 h-[calc(100vh-5rem)]">
        {/* Page header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Messages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalUnread > 0 ? `${totalUnread} unread messages` : 'All caught up!'}
            </p>
          </div>
          <button 
            onClick={() => setShowPlayerSearch(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <MessageSquarePlus size={16} />
            <span className="hidden sm:inline">New Message</span>
          </button>
        </div>

        {/* Main messaging layout */}
        <div className="flex flex-1 min-h-0 bg-card border border-border rounded-xl shadow-card overflow-hidden">

          {/* Conversation List */}
          <div className={`flex flex-col w-full md:w-80 lg:w-96 border-r border-border flex-shrink-0 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 size={24} className="animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {pinned.length > 0 && (
                    <div>
                      <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-1.5 flex items-center gap-1.5">
                        <Pin size={10} /> Pinned
                      </p>
                      {pinned.map((conv, i) => (
                        <ConvItem key={conv.id} conv={conv} active={activeConv?.id === conv.id} colorIdx={i} onSelect={handleSelectConv} />
                      ))}
                    </div>
                  )}
                  {unpinned.length > 0 && (
                    <div>
                      {pinned.length > 0 && (
                        <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-1.5">All Messages</p>
                      )}
                      {unpinned.map((conv, i) => (
                        <ConvItem key={conv.id} conv={conv} active={activeConv?.id === conv.id} colorIdx={i + pinned.length} onSelect={handleSelectConv} />
                      ))}
                    </div>
                  )}
                  {!loading && filteredConvs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <Search size={28} className="mb-2 opacity-40" />
                      <p className="text-sm">No conversations found</p>
                    </div>
                  )}
                  {!loading && conversations.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <MessageSquarePlus size={28} className="mb-2 opacity-40" />
                      <p className="text-sm">No conversations yet</p>
                      <p className="text-xs mt-1">Start a new message to connect with players</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex flex-col flex-1 min-w-0 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
            {activeConv ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                  <button
                    className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                    onClick={() => setMobileView('list')}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="relative">
                    {activeConv.avatarUrl ? (
                      <img 
                        src={activeConv.avatarUrl} 
                        alt={activeConv.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-9 h-9 rounded-full ${avatarColors[conversations.findIndex(c => c.id === activeConv.id) % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold`}>
                        {activeConv.avatar}
                      </div>
                    )}
                    {activeConv.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-positive border-2 border-card rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-sm truncate">{activeConv.name}</p>
                      <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${skillColors[activeConv.skill] || 'bg-muted text-muted-foreground'}`}>
                        {activeConv.skill}
                      </span>
                    </div>
                    <p className="text-2xs text-muted-foreground">
                      {activeConv.online ? 'Online now' : 'Last seen recently'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => initiateCall('voice', activeConv.name, activeConv.avatarUrl || undefined, activeConv.otherUserId)}
                    >
                      <Phone size={16} />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => initiateCall('video', activeConv.name, activeConv.avatarUrl || undefined, activeConv.otherUserId)}
                    >
                      <Video size={16} />
                    </button>
                    <div className="relative">
                      <button
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowMenu(!showMenu)}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-card-md z-20 py-1">
                          {[
                            { icon: Pin, label: 'Pin Conversation' },
                            { icon: Archive, label: 'Archive' },
                            { icon: BellOff, label: 'Mute Notifications' },
                            { icon: Trash2, label: 'Delete Chat', danger: true },
                          ].map((item) => (
                            <button
                              key={item.label}
                              className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors ${item.danger ? 'text-negative' : 'text-foreground'}`}
                              onClick={() => setShowMenu(false)}
                            >
                              <item.icon size={14} />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 flex flex-col gap-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquarePlus size={32} className="mb-2 opacity-40" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const showDate = idx === 0 || formatMessageTime(messages[idx - 1].created_at) !== formatMessageTime(msg.created_at);
                      return (
                        <React.Fragment key={msg.id}>
                          {showDate && idx === 0 && (
                            <div className="flex items-center gap-3 my-2">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-2xs text-muted-foreground font-medium px-2">Today</span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          )}
                          <div className={`flex items-end gap-2 ${msg.isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!msg.isOwn && (
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-2xs font-bold flex-shrink-0 mb-0.5 overflow-hidden">
                                {activeConv.avatarUrl ? (
                                  <img 
                                    src={activeConv.avatarUrl} 
                                    alt={activeConv.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full gradient-green flex items-center justify-center">
                                    {activeConv.avatar}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className={`max-w-[70%] flex flex-col gap-0.5 ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                msg.isOwn
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-muted text-foreground rounded-bl-sm'
                              }`}>
                                {msg.text}
                              </div>
                              <div className="flex items-center gap-1 px-1">
                                <span className="text-2xs text-muted-foreground">{formatMessageTime(msg.created_at)}</span>
                                {msg.isOwn && (
                                  msg.status === 'read' ? <CheckCheck size={12} className="text-primary" /> :
                                  msg.status === 'delivered' ? <CheckCheck size={12} className="text-muted-foreground" /> :
                                  <Check size={12} className="text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="px-4 py-3 border-t border-border flex-shrink-0">
                  <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2">
                    <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                      <Paperclip size={16} />
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={`Message ${activeConv.name}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
                    />
                    <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                      <Smile size={16} />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!inputText.trim()}
                      className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                  <p className="text-2xs text-muted-foreground text-center mt-1.5">Press Enter to send · Shift+Enter for new line</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquarePlus size={48} className="mb-3 opacity-40" />
                <p className="text-lg font-semibold">Select a conversation</p>
                <p className="text-sm mt-1">Choose a conversation from the list to start messaging</p>
              </div>
            )}
          </div>
        </div>

        {/* Player Search Modal */}
        {showPlayerSearch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-card-md w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Start New Conversation</h2>
                <button
                  onClick={() => {
                    setShowPlayerSearch(false);
                    setPlayerSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">
                <div className="relative mb-4">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or player ID..."
                    value={playerSearchQuery}
                    onChange={(e) => {
                      setPlayerSearchQuery(e.target.value);
                      searchPlayers(e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                  />
                  {searchingPlayers && (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.length === 0 && playerSearchQuery && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No players found</p>
                    </div>
                  )}
                  {searchResults.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => startConversation(player.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        {player.avatar_url ? (
                          <img 
                            src={player.avatar_url} 
                            alt={player.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full gradient-green flex items-center justify-center">
                            {getInitials(player.full_name)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{player.full_name}</p>
                        <p className="text-xs text-muted-foreground">{player.player_id}</p>
                      </div>
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${skillColors[capitalize(player.skill_level)] || 'bg-muted text-muted-foreground'}`}>
                        {capitalize(player.skill_level)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

interface ConvItemProps {
  conv: Conversation;
  active: boolean;
  colorIdx: number;
  onSelect: (conv: Conversation) => void;
}

function ConvItem({ conv, active, colorIdx, onSelect }: ConvItemProps) {
  return (
    <button
      onClick={() => onSelect(conv)}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${active ? 'bg-primary/5 border-r-2 border-primary' : ''}`}
    >
      <div className="relative flex-shrink-0">
        {conv.avatarUrl ? (
          <img 
            src={conv.avatarUrl} 
            alt={conv.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className={`w-10 h-10 rounded-full ${avatarColors[colorIdx % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold`}>
            {conv.skill === 'Group' ? <Users size={16} /> : conv.avatar}
          </div>
        )}
        {conv.online && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-positive border-2 border-card rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={`text-sm font-semibold truncate ${active ? 'text-primary' : 'text-foreground'}`}>{conv.name}</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {conv.muted && <BellOff size={11} className="text-muted-foreground" />}
            <span className="text-2xs text-muted-foreground">{conv.timestamp}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
          {conv.unread > 0 && (
            <span className="flex-shrink-0 bg-primary text-primary-foreground text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
