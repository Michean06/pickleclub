'use client';

import React from 'react';
import { ChatProvider } from '@/contexts/ChatContext';
import { ChatList, ChatWindow } from '@/components/messaging';

export default function MessagingPage() {
  return (
    <ChatProvider>
      <div className="flex h-screen bg-gray-100">
        <ChatList />
        <ChatWindow />
      </div>
    </ChatProvider>
  );
}
