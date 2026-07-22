'use client';

import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Search, Send, MoreVertical, Phone, Video, ChevronLeft, CheckCheck, Check, Smile, Paperclip, Pin, Archive, BellOff, Trash2, Users, MessageSquarePlus, X } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isOwn: boolean;
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
  skill: string;
  pinned?: boolean;
  muted?: boolean;
  messages: Message[];
}

const conversations: Conversation[] = [
  {
    id: 'conv-1',
    name: 'Angela Torres',
    avatar: 'AT',
    lastMessage: 'Are you joining the doubles tournament this Saturday?',
    timestamp: '9:42 AM',
    unread: 2,
    online: true,
    skill: 'Pro',
    pinned: true,
    messages: [
      { id: 'm1', senderId: 'angela', text: 'Hey! Great game yesterday 🏓', timestamp: '9:30 AM', status: 'read', isOwn: false },
      { id: 'm2', senderId: 'me', text: 'Thanks! You were on fire with those cross-court shots.', timestamp: '9:33 AM', status: 'read', isOwn: true },
      { id: 'm3', senderId: 'angela', text: 'Haha I\'ve been practicing that for weeks. Finally clicked!', timestamp: '9:35 AM', status: 'read', isOwn: false },
      { id: 'm4', senderId: 'me', text: 'It showed. We should do a rematch next week.', timestamp: '9:38 AM', status: 'read', isOwn: true },
      { id: 'm5', senderId: 'angela', text: 'Are you joining the doubles tournament this Saturday?', timestamp: '9:42 AM', status: 'delivered', isOwn: false },
    ],
  },
  {
    id: 'conv-2',
    name: 'Kim Ong',
    avatar: 'KO',
    lastMessage: 'Court 3 is free at 3 PM if you want to practice',
    timestamp: 'Yesterday',
    unread: 0,
    online: true,
    skill: 'Advanced',
    messages: [
      { id: 'm1', senderId: 'kim', text: 'Morning! Heading to the club?', timestamp: 'Yesterday 8:00 AM', status: 'read', isOwn: false },
      { id: 'm2', senderId: 'me', text: 'Yeah, around 9. Want to warm up together?', timestamp: 'Yesterday 8:05 AM', status: 'read', isOwn: true },
      { id: 'm3', senderId: 'kim', text: 'Perfect. Court 3 is free at 3 PM if you want to practice', timestamp: 'Yesterday 8:10 AM', status: 'read', isOwn: false },
    ],
  },
  {
    id: 'conv-3',
    name: 'Maria Santos',
    avatar: 'MS',
    lastMessage: 'Thanks for the tips on my backhand!',
    timestamp: 'Yesterday',
    unread: 1,
    online: false,
    skill: 'Advanced',
    messages: [
      { id: 'm1', senderId: 'maria', text: 'Do you have time to coach me a bit on my backhand?', timestamp: 'Yesterday 2:00 PM', status: 'read', isOwn: false },
      { id: 'm2', senderId: 'me', text: 'Sure! The key is to keep your elbow close and follow through.', timestamp: 'Yesterday 2:15 PM', status: 'read', isOwn: true },
      { id: 'm3', senderId: 'maria', text: 'Thanks for the tips on my backhand!', timestamp: 'Yesterday 3:00 PM', status: 'read', isOwn: false },
    ],
  },
  {
    id: 'conv-4',
    name: 'Doubles Crew 🏓',
    avatar: 'DC',
    lastMessage: 'Jose: I\'ll bring extra balls tomorrow',
    timestamp: 'Mon',
    unread: 5,
    online: false,
    skill: 'Group',
    messages: [
      { id: 'm1', senderId: 'juan', text: 'Who\'s in for Monday morning session?', timestamp: 'Mon 7:00 AM', status: 'read', isOwn: false },
      { id: 'm2', senderId: 'me', text: 'I\'m in! What time?', timestamp: 'Mon 7:05 AM', status: 'read', isOwn: true },
      { id: 'm3', senderId: 'jose', text: 'Let\'s do 8 AM. I\'ll bring extra balls tomorrow', timestamp: 'Mon 7:10 AM', status: 'read', isOwn: false },
    ],
  },
  {
    id: 'conv-5',
    name: 'Juan Dela Cruz',
    avatar: 'JD',
    lastMessage: 'Good match! See you next week.',
    timestamp: 'Sun',
    unread: 0,
    online: false,
    skill: 'Advanced',
    muted: true,
    messages: [
      { id: 'm1', senderId: 'juan', text: 'Good match! See you next week.', timestamp: 'Sun 5:00 PM', status: 'read', isOwn: false },
      { id: 'm2', senderId: 'me', text: 'Likewise! You\'ve improved a lot.', timestamp: 'Sun 5:05 PM', status: 'read', isOwn: true },
    ],
  },
  {
    id: 'conv-6',
    name: 'Jose Ramos',
    avatar: 'JR',
    lastMessage: 'Can you cover my slot on Thursday?',
    timestamp: 'Sat',
    unread: 0,
    online: false,
    skill: 'Intermediate',
    messages: [
      { id: 'm1', senderId: 'jose', text: 'Can you cover my slot on Thursday?', timestamp: 'Sat 11:00 AM', status: 'read', isOwn: false },
      { id: 'm2', senderId: 'me', text: 'Let me check my schedule and get back to you.', timestamp: 'Sat 11:30 AM', status: 'read', isOwn: true },
    ],
  },
];

const skillColors: Record<string, string> = {
  Pro: 'bg-amber-100 text-amber-700',
  Advanced: 'bg-blue-100 text-blue-700',
  Intermediate: 'bg-green-100 text-green-700',
  Group: 'bg-purple-100 text-purple-700',
};

const avatarColors = ['gradient-green', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];

export default function PlayerMessagingPage() {
  const [activeConv, setActiveConv] = useState<Conversation>(conversations[0]);
  const [messages, setMessages] = useState<Message[]>(conversations[0].messages);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConvs = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filteredConvs.filter((c) => c.pinned);
  const unpinned = filteredConvs.filter((c) => !c.pinned);

  const handleSelectConv = (conv: Conversation) => {
    setActiveConv(conv);
    setMessages(conv.messages);
    setMobileView('chat');
    setShowMenu(false);
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      senderId: 'me',
      text,
      timestamp: 'Just now',
      status: 'sent',
      isOwn: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

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
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
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
              {pinned.length > 0 && (
                <div>
                  <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-1.5 flex items-center gap-1.5">
                    <Pin size={10} /> Pinned
                  </p>
                  {pinned.map((conv, i) => (
                    <ConvItem key={conv.id} conv={conv} active={activeConv.id === conv.id} colorIdx={i} onSelect={handleSelectConv} />
                  ))}
                </div>
              )}
              {unpinned.length > 0 && (
                <div>
                  {pinned.length > 0 && (
                    <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-1.5">All Messages</p>
                  )}
                  {unpinned.map((conv, i) => (
                    <ConvItem key={conv.id} conv={conv} active={activeConv.id === conv.id} colorIdx={i + pinned.length} onSelect={handleSelectConv} />
                  ))}
                </div>
              )}
              {filteredConvs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Search size={28} className="mb-2 opacity-40" />
                  <p className="text-sm">No conversations found</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex flex-col flex-1 min-w-0 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
              <button
                className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                onClick={() => setMobileView('list')}
              >
                <ChevronLeft size={18} />
              </button>
              <div className="relative">
                <div className={`w-9 h-9 rounded-full ${avatarColors[conversations.findIndex(c => c.id === activeConv.id) % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold`}>
                  {activeConv.avatar}
                </div>
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
                <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Phone size={16} />
                </button>
                <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
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
              {messages.map((msg, idx) => {
                const showDate = idx === 0 || messages[idx - 1].timestamp !== msg.timestamp;
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
                        <div className="w-7 h-7 rounded-full gradient-green flex items-center justify-center text-white text-2xs font-bold flex-shrink-0 mb-0.5">
                          {activeConv.avatar}
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
                          <span className="text-2xs text-muted-foreground">{msg.timestamp}</span>
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
              })}
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
          </div>
        </div>
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
        <div className={`w-10 h-10 rounded-full ${avatarColors[colorIdx % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold`}>
          {conv.skill === 'Group' ? <Users size={16} /> : conv.avatar}
        </div>
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
