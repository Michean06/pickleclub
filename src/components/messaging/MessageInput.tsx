'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, X } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: File[]) => void;
  conversationId: string;
  disabled?: boolean;
}

export default function MessageInput({ onSendMessage, conversationId, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { updateTypingStatus } = useChat();

  useEffect(() => {
    if (message.length > 0 && !isTyping) {
      setIsTyping(true);
      updateTypingStatus(conversationId, true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(conversationId, false);
    }, 1000);

    return () => clearTimeout(typingTimeoutRef.current);
  }, [message, conversationId, updateTypingStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;

    onSendMessage(message, attachments);
    setMessage('');
    setAttachments([]);
    updateTypingStatus(conversationId, false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center px-3 py-2 bg-gray-100 rounded-lg text-sm"
            >
              <span className="truncate max-w-xs">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          disabled={disabled}
          title="Attach file"
        >
          <Paperclip className="w-5 h-5 text-gray-600" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          disabled={disabled}
          title="Add emoji"
        >
          <Smile className="w-5 h-5 text-gray-600" />
        </button>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <button
          type="submit"
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
