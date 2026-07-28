'use client';

import React from 'react';
import { formatMessageTime } from '@/lib/messaging';
import { Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const { content, sender, created_at, file_url, message_type, reactions, reply_to } = message;

  const renderContent = () => {
    if (message_type === 'image' && file_url) {
      return (
        <div className="mt-2">
          <img
            src={file_url}
            alt="Shared image"
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(file_url, '_blank')}
          />
        </div>
      );
    }

    if (message_type === 'video' && file_url) {
      return (
        <div className="mt-2">
          <video controls className="max-w-xs rounded-lg">
            <source src={file_url} />
          </video>
        </div>
      );
    }

    if (message_type === 'file' && file_url) {
      return (
        <a
          href={file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center mt-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <span className="text-2xl mr-2">📎</span>
          <span className="text-sm">{content || 'Download file'}</span>
        </a>
      );
    }

    return <p className="text-gray-800">{content}</p>;
  };

  const renderReactions = () => {
    if (!reactions || Object.keys(reactions).length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {Object.entries(reactions).map(([emoji, users]) => (
          <span
            key={emoji}
            className="px-2 py-1 bg-gray-100 rounded-full text-sm"
          >
            {emoji} {Array.isArray(users) ? users.length : 0}
          </span>
        ))}
      </div>
    );
  };

  const renderReply = () => {
    if (!reply_to) return null;

    return (
      <div className="mb-2 p-2 bg-gray-100 rounded-lg border-l-2 border-gray-300">
        <span className="text-xs text-gray-500">Replying to</span>
        <p className="text-sm text-gray-600 truncate">{reply_to.content}</p>
      </div>
    );
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg ${isOwn ? 'order-2' : 'order-1'}`}>
        {!isOwn && (
          <div className="flex items-center mb-1">
            {sender?.avatar_url ? (
              <img
                src={sender.avatar_url}
                alt={sender.name}
                className="w-6 h-6 rounded-full mr-2"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 mr-2 flex items-center justify-center text-xs">
                {sender?.name?.charAt(0) || '?'}
              </div>
            )}
            <span className="text-xs text-gray-500">{sender?.name || 'Unknown'}</span>
          </div>
        )}

        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-blue-500 text-white rounded-br-sm'
              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
          }`}
        >
          {renderReply()}
          {renderContent()}
          {renderReactions()}
        </div>

        <div className={`flex items-center mt-1 text-xs text-gray-500 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span>{formatMessageTime(created_at)}</span>
          {isOwn && (
            <span className="ml-2">
              {message.status === 'read' ? (
                <CheckCheck className="w-4 h-4 text-blue-500" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
