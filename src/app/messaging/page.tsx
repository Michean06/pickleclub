'use client';

import React, { useState } from 'react';
import { ChatProvider } from '@/contexts/ChatContext';
import { ChatList, ChatWindow } from '@/components/messaging';
import { Menu, X } from 'lucide-react';

export default function MessagingPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <ChatProvider>
      <div className="flex h-screen bg-gray-100">
        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <div className={`fixed left-0 top-0 h-full z-40 md:hidden transition-transform duration-300 ease-in-out ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="relative h-full">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full shadow-md md:hidden"
            >
              <X size={20} />
            </button>
            <ChatList />
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:block w-80 lg:w-96">
          <ChatList />
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col">
          {/* Mobile header */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <span className="font-bold text-gray-800">Messages</span>
          </div>
          <ChatWindow />
        </div>
      </div>
    </ChatProvider>
  );
}
