'use client';

import React from 'react';
import { formatMessageTime } from '@/lib/messaging';

interface ConversationItemProps {
  conversation: any;
  isActive: boolean;
  onClick: () => void;
}

export default function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const { title, members, updated_at, type } = conversation;
  
  const getAvatar = () => {
    if (type === 'group') {
      return null;
    }
    if (members?.length > 0) {
      const otherMember = members.find((m: any) => m.users?.id !== conversation.current_user_id);
      return otherMember?.users?.avatar_url;
    }
    return null;
  };

  const getDisplayName = () => {
    if (title) return title;
    if (type === 'direct' && members?.length > 0) {
      const otherMember = members.find((m: any) => m.users?.id !== conversation.current_user_id);
      return otherMember?.users?.name || 'Unknown';
    }
    return 'Conversation';
  };

  const getLastMessage = () => {
    if (conversation.last_message) {
      return conversation.last_message.content || 
             (conversation.last_message.message_type !== 'text' ? '📎 Attachment' : '');
    }
    return 'No messages yet';
  };

  const getUnreadCount = () => {
    if (!members) return 0;
    const member = members.find((m: any) => m.users?.id === conversation.current_user_id);
    if (!member) return 0;
    
    // Calculate unread count based on last_read_at
    // This would need to be computed from messages
    return 0;
  };

  const unreadCount = getUnreadCount();

  return (
    <div
      className={`flex items-center p-4 cursor-pointer transition-colors ${
        isActive ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50 border-l-4 border-transparent'
      }`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mr-3">
        {getAvatar() ? (
          <img
            src={getAvatar()}
            alt={getDisplayName()}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
            {getDisplayName().charAt(0).toUpperCase()}
          </div>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-gray-900 truncate">{getDisplayName()}</h4>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {formatMessageTime(updated_at)}
          </span>
        </div>
        <p className="text-sm text-gray-500 truncate">{getLastMessage()}</p>
      </div>
    </div>
  );
}
