'use client';

import React, { useState, useEffect } from 'react';
import { Search, MessageSquarePlus, MoreVertical } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { formatMessageTime, getUnreadCount } from '@/lib/messaging';
import ConversationItem from './ConversationItem';

interface ChatListProps {
  onNewConversation?: () => void;
}

export default function ChatList({ onNewConversation }: ChatListProps) {
  const { conversations, loading, fetchConversations, activeConversation, setActiveConversation } = useChat();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const filteredConversations = conversations.filter(conv => {
    const title = conv.title?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return title.includes(query);
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
          <button
            onClick={onNewConversation}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="New conversation"
          >
            <MessageSquarePlus className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading conversations...</div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquarePlus className="w-12 h-12 mb-2" />
            <p>No conversations found</p>
          </div>
        ) : (
          filteredConversations.map(conversation => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={activeConversation?.id === conversation.id}
              onClick={() => setActiveConversation(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
}
