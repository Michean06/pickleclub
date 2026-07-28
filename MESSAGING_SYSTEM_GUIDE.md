# Production-Ready Real-Time Messaging System Implementation Guide

## Table of Contents
1. [Overall System Architecture](#1-overall-system-architecture)
2. [Database Design](#2-database-design)
3. [SQL Scripts](#3-sql-scripts)
4. [Supabase Realtime](#4-supabase-realtime)
5. [Backend (Node.js/Express)](#5-backend-nodejsexpress)
6. [Frontend (React + Vite)](#6-frontend-react--vite)
7. [Messaging Features](#7-messaging-features)
8. [File Sharing](#8-file-sharing)
9. [Reservation Integration](#9-reservation-integration)
10. [Security](#10-security)
11. [Performance](#11-performance)
12. [Production Deployment](#12-production-deployment)
13. [Best Practices](#13-best-practices)
14. [Bonus Features](#14-bonus-features)

---

## 1. Overall System Architecture

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React Web  │  │  Mobile App  │  │  Admin Panel │          │
│  │   (Vite)     │  │  (React Native)│ │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                  │
│         └─────────────────┼─────────────────┘                  │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │
┌───────────────────────────┼────────────────────────────────────┐
│                    API GATEWAY LAYER                            │
├───────────────────────────┼────────────────────────────────────┤
│         ┌─────────────────┴─────────────────┐                  │
│         │         Express.js Backend         │                  │
│         │    (REST API + WebSocket Server)   │                  │
│         └─────────────────┬─────────────────┘                  │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │
┌───────────────────────────┼────────────────────────────────────┐
│                    SUPABASE LAYER                               │
├───────────────────────────┼────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Supabase Client SDK                        │   │
│  │  (Direct PostgreSQL access via RLS)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Supabase Services                          │   │
│  ├─────────────┬─────────────┬─────────────┬───────────────┤   │
│  │ PostgreSQL  │ Auth        │ Realtime    │ Storage       │   │
│  │ (Database)  │ (JWT Tokens)│ (WebSockets)│ (File Upload) │   │
│  └─────────────┴─────────────┴─────────────┴───────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow: Sender to Receiver

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  Sender  │                    │ Supabase │                    │ Receiver │
└─────┬────┘                    └────┬─────┘                    └────┬─────┘
      │                              │                               │
      │ 1. User types message         │                               │
      │    and clicks send            │                               │
      │                              │                               │
      │ 2. Optimistic UI update       │                               │
      │    (show message immediately) │                               │
      │                              │                               │
      │ 3. INSERT via Supabase Client │                               │
      │    or REST API               │                               │
      │─────────────────────────────>│                               │
      │                              │                               │
      │                              │ 4. Validate & insert message  │
      │                              │    into PostgreSQL            │
      │                              │                               │
      │                              │ 5. Trigger Realtime broadcast │
      │                              │    to all subscribers          │
      │                              │──────────────────────────────>│
      │                              │                               │
      │                              │                               │ 6. Receiver
      │                              │                               │    receives
      │                              │                               │    realtime
      │                              │                               │    event
      │                              │                               │
      │                              │                               │ 7. Update UI
      │                              │                               │    with new
      │                              │                               │    message
      │                              │                               │
      │ 8. Read receipt update       │                               │
      │<────────────────────────────│                               │
      │                              │                               │
```

### 1.3 Supabase Realtime Broadcast Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    REALTIME BROADCAST FLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. Client subscribes to channel:
   supabase.channel('conversation:123')
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'messages',
       filter: 'conversation_id=eq.123'
     }, callback)
     .subscribe()

2. Database triggers on INSERT:
   - PostgreSQL trigger fires on messages table
   - Supabase Realtime captures the event
   - Event is broadcast to all subscribers

3. WebSocket connection:
   - Client maintains persistent WebSocket connection
   - Server pushes events in real-time
   - Client receives and processes events

4. Event types supported:
   - INSERT: New message added
   - UPDATE: Message status changed (read, delivered)
   - DELETE: Message removed
```

---

## 2. Database Design

### 2.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────────┐       ┌──────────────┐
│    users     │       │ conversation_members │       │conversations │
├──────────────┤       ├──────────────────────┤       ├──────────────┤
│ id (PK)      │◄──────│ user_id (FK)         │◄──────│ id (PK)      │
│ email        │       │ conversation_id (FK) │       │ created_by   │
│ name         │       │ role                 │       │ type         │
│ avatar_url   │       │ joined_at            │       │ title        │
│ last_seen    │       │ last_read_at         │       │ reservation_id│
│ created_at   │       │                      │       │ created_at   │
│ updated_at   │       │                      │       │ updated_at   │
└──────────────┘       └──────────────────────┘       └──────┬───────┘
                                                           │
                                                           │
                                                           │
┌──────────────┐       ┌──────────────────────┐            │
│   messages   │       │    typing_status     │            │
├──────────────┤       ├──────────────────────┤            │
│ id (PK)      │       │ conversation_id (FK) │────────────┘
│ conversation │       │ user_id (FK)         │◄──────┐
│   _id (FK)   │       │ is_typing            │       │
│ sender_id    │       │ updated_at           │       │
│ content      │       └──────────────────────┘       │
│ message_type │                                      │
│ file_url     │       ┌──────────────────────┐       │
│ metadata     │       │    online_users      │       │
│ status       │       ├──────────────────────┤       │
│ read_by      │       │ user_id (PK)         │◄──────┘
│ created_at   │       │ last_active          │
│ updated_at   │       │ socket_id            │
└──────────────┘       └──────────────────────┘

┌──────────────┐
│  reservations │
├──────────────┤
│ id (PK)      │
│ customer_id  │
│ staff_id     │
│ status       │
│ created_at   │
└──────────────┘
```

### 2.2 Table Descriptions

#### **users**
Stores user profile information and authentication data.
- **Purpose**: Central user directory for authentication and profile management
- **Key fields**: Authentication data, profile info, online status

#### **conversations**
Stores conversation metadata and settings.
- **Purpose**: Container for messages between users or groups
- **Key fields**: Type (direct/group), title, reservation link

#### **conversation_members**
Many-to-many relationship between users and conversations.
- **Purpose**: Manage conversation membership and permissions
- **Key fields**: User roles, read receipts, join timestamps

#### **messages**
Stores individual messages within conversations.
- **Purpose**: Core messaging data with status tracking
- **Key fields**: Content, sender, status, file attachments

#### **typing_status**
Tracks real-time typing indicators.
- **Purpose**: Show typing indicators in UI
- **Key fields**: User typing state per conversation

#### **online_users**
Tracks user online presence and socket connections.
- **Purpose**: Show online status and last seen
- **Key fields**: Last active timestamp, socket mapping

---

## 3. SQL Scripts

### 3.1 Create Tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    last_seen TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    type VARCHAR(50) NOT NULL DEFAULT 'direct', -- 'direct', 'group', 'reservation'
    created_by UUID REFERENCES users(id),
    reservation_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation members table
CREATE TABLE conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member', 'staff', 'customer'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'video', 'file', 'audio'
    file_url TEXT,
    file_metadata JSONB DEFAULT '{}',
    reply_to_id UUID REFERENCES messages(id),
    status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'delivered', 'read'
    read_by JSONB DEFAULT '[]', -- Array of user IDs who read the message
    reactions JSONB DEFAULT '{}',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Typing status table
CREATE TABLE typing_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Online users table
CREATE TABLE online_users (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    socket_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'
);

-- Reservations table (for integration)
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id),
    staff_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    reservation_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.2 Create Indexes

```sql
-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_seen ON users(last_seen);
CREATE INDEX idx_users_is_online ON users(is_online);

-- Conversations indexes
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_reservation_id ON conversations(reservation_id);
CREATE INDEX idx_conversations_created_by ON conversations(created_by);

-- Conversation members indexes
CREATE INDEX idx_conversation_members_conversation_id ON conversation_members(conversation_id);
CREATE INDEX idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX idx_conversation_members_role ON conversation_members(role);

-- Messages indexes (CRITICAL for performance)
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Typing status indexes
CREATE INDEX idx_typing_status_conversation_id ON typing_status(conversation_id);
CREATE INDEX idx_typing_status_user_id ON typing_status(user_id);
CREATE INDEX idx_typing_status_updated_at ON typing_status(updated_at);

-- Online users indexes
CREATE INDEX idx_online_users_last_active ON online_users(last_active);

-- Reservations indexes
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_staff_id ON reservations(staff_id);
CREATE INDEX idx_reservations_status ON reservations(status);
```

### 3.3 Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
```

### 3.4 RLS Policies

```sql
-- USERS TABLE POLICIES

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Service role can insert users (handled by Supabase Auth)
CREATE POLICY "Service role can insert users"
    ON users FOR INSERT
    WITH CHECK (auth.role() = 'service_role');


-- CONVERSATIONS TABLE POLICIES

-- Users can read conversations they are members of
CREATE POLICY "Users can read own conversations"
    ON conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_members
            WHERE conversation_members.conversation_id = conversations.id
            AND conversation_members.user_id = auth.uid()
        )
    );

-- Users can insert conversations they will be members of
CREATE POLICY "Users can create conversations"
    ON conversations FOR INSERT
    WITH CHECK (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM conversation_members
            WHERE conversation_members.conversation_id = conversations.id
            AND conversation_members.user_id = auth.uid()
        )
    );

-- Conversation admins can update conversations
CREATE POLICY "Conversation admins can update"
    ON conversations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM conversation_members
            WHERE conversation_members.conversation_id = conversations.id
            AND conversation_members.user_id = auth.uid()
            AND conversation_members.role IN ('admin')
        )
    );


-- CONVERSATION MEMBERS TABLE POLICIES

-- Users can read members of conversations they are in
CREATE POLICY "Users can read conversation members"
    ON conversation_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = conversation_members.conversation_id
            AND cm.user_id = auth.uid()
        )
    );

-- Users can insert themselves into conversations
CREATE POLICY "Users can join conversations"
    ON conversation_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own membership
CREATE POLICY "Users can update own membership"
    ON conversation_members FOR UPDATE
    USING (user_id = auth.uid());

-- Conversation admins can manage members
CREATE POLICY "Admins can manage members"
    ON conversation_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = conversation_members.conversation_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
    );


-- MESSAGES TABLE POLICIES

-- Users can read messages from conversations they are members of
CREATE POLICY "Users can read own conversation messages"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_members
            WHERE conversation_members.conversation_id = messages.conversation_id
            AND conversation_members.user_id = auth.uid()
        )
    );

-- Users can insert messages into conversations they are members of
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversation_members
            WHERE conversation_members.conversation_id = messages.conversation_id
            AND conversation_members.user_id = auth.uid()
        )
    );

-- Users can update their own messages
CREATE POLICY "Users can update own messages"
    ON messages FOR UPDATE
    USING (sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
    ON messages FOR DELETE
    USING (sender_id = auth.uid());


-- TYPING STATUS TABLE POLICIES

-- Users can read typing status in their conversations
CREATE POLICY "Users can read typing status"
    ON typing_status FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_members
            WHERE conversation_members.conversation_id = typing_status.conversation_id
            AND conversation_members.user_id = auth.uid()
        )
    );

-- Users can update their own typing status
CREATE POLICY "Users can update own typing status"
    ON typing_status FOR UPSERT
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own typing status
CREATE POLICY "Users can delete own typing status"
    ON typing_status FOR DELETE
    USING (user_id = auth.uid());


-- ONLINE USERS TABLE POLICIES

-- Users can read online status
CREATE POLICY "Users can read online status"
    ON online_users FOR SELECT
    USING (true);

-- Users can update their own online status
CREATE POLICY "Users can update own online status"
    ON online_users FOR UPSERT
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own online status
CREATE POLICY "Users can delete own online status"
    ON online_users FOR DELETE
    USING (user_id = auth.uid());


-- RESERVATIONS TABLE POLICIES

-- Customers can read their own reservations
CREATE POLICY "Customers can read own reservations"
    ON reservations FOR SELECT
    USING (customer_id = auth.uid());

-- Staff can read assigned reservations
CREATE POLICY "Staff can read assigned reservations"
    ON reservations FOR SELECT
    USING (staff_id = auth.uid());

-- Service role can manage reservations
CREATE POLICY "Service role can manage reservations"
    ON reservations FOR ALL
    USING (auth.role() = 'service_role');
```

### 3.5 Functions and Triggers

```sql
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation updated_at when message is added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- Function to clean up old typing status
CREATE OR REPLACE FUNCTION cleanup_old_typing_status()
RETURNS void AS $$
BEGIN
    DELETE FROM typing_status
    WHERE updated_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Supabase Realtime

### 4.1 Enable Replication

```sql
-- Enable realtime replication for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime replication for conversations table
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Enable realtime replication for conversation_members table
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;

-- Enable realtime replication for typing_status table
ALTER PUBLICATION supabase_realtime ADD TABLE typing_status;
```

### 4.2 Realtime Channels Explained

Realtime channels in Supabase use WebSocket connections to broadcast database changes in real-time. Each channel can subscribe to specific table changes with filters.

**Channel Structure:**
- Channel name: Arbitrary identifier (e.g., `conversation:123`)
- Event types: `INSERT`, `UPDATE`, `DELETE`
- Filters: Row-level filtering (e.g., `conversation_id=eq.123`)

### 4.3 INSERT, UPDATE, DELETE Events

```javascript
// INSERT Event - New message
{
  event: 'INSERT',
  schema: 'public',
  table: 'messages',
  commit_timestamp: '2024-01-15T10:30:00Z',
  old: null,
  new: {
    id: 'uuid',
    conversation_id: 'uuid',
    sender_id: 'uuid',
    content: 'Hello',
    created_at: '2024-01-15T10:30:00Z'
  }
}

// UPDATE Event - Message status change
{
  event: 'UPDATE',
  schema: 'public',
  table: 'messages',
  commit_timestamp: '2024-01-15T10:31:00Z',
  old: { status: 'sent' },
  new: { status: 'read' }
}

// DELETE Event - Message deleted
{
  event: 'DELETE',
  schema: 'public',
  table: 'messages',
  commit_timestamp: '2024-01-15T10:32:00Z',
  old: { id: 'uuid' },
  new: null
}
```

### 4.4 Subscription Management

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

class RealtimeManager {
  constructor() {
    this.channels = new Map();
  }

  // Subscribe to conversation messages
  subscribeToConversation(conversationId, callbacks) {
    const channelName = `conversation:${conversationId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => callbacks.onInsert?.(payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => callbacks.onUpdate?.(payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => callbacks.onDelete?.(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => callbacks.onTyping?.(payload)
      )
      .subscribe((status) => {
        console.log(`Subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  // Unsubscribe from a channel
  unsubscribe(conversationId) {
    const channelName = `conversation:${conversationId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }
}

export default new RealtimeManager();
```

### 4.5 Best Practices for Realtime

1. **Always unsubscribe on component unmount**
2. **Use specific filters to reduce bandwidth**
3. **Implement reconnection logic**
4. **Handle subscription errors gracefully**
5. **Batch multiple subscriptions when possible**
6. **Use presence features for online status**

---

## 5. Backend (Node.js/Express)

### 5.1 Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── supabase.js
│   │   └── index.js
│   ├── controllers/
│   │   ├── conversationController.js
│   │   ├── messageController.js
│   │   ├── userController.js
│   │   └── fileController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── rateLimiter.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── conversations.js
│   │   ├── messages.js
│   │   ├── users.js
│   │   └── files.js
│   ├── services/
│   │   ├── conversationService.js
│   │   ├── messageService.js
│   │   ├── notificationService.js
│   │   └── fileService.js
│   ├── utils/
│   │   ├── logger.js
│   │   └── helpers.js
│   ├── validators/
│   │   ├── conversationValidator.js
│   │   └── messageValidator.js
│   └── app.js
├── tests/
│   ├── unit/
│   └── integration/
├── .env
├── .env.example
├── package.json
└── README.md
```

### 5.2 API Endpoints

#### **Conversations**

```javascript
// src/routes/conversations.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import * as conversationController from '../controllers/conversationController.js';

const router = express.Router();

// Create a new conversation
router.post(
  '/',
  authenticate,
  rateLimiter({ maxRequests: 10, windowMs: 60000 }),
  conversationController.createConversation
);

// Get user's conversations
router.get(
  '/',
  authenticate,
  conversationController.getConversations
);

// Get conversation by ID
router.get(
  '/:id',
  authenticate,
  conversationController.getConversationById
);

// Update conversation
router.put(
  '/:id',
  authenticate,
  conversationController.updateConversation
);

// Add member to conversation
router.post(
  '/:id/members',
  authenticate,
  conversationController.addMember
);

// Remove member from conversation
router.delete(
  '/:id/members/:userId',
  authenticate,
  conversationController.removeMember
);

// Mark conversation as read
router.post(
  '/:id/read',
  authenticate,
  conversationController.markAsRead
);

export default router;
```

#### **Messages**

```javascript
// src/routes/messages.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import * as messageController from '../controllers/messageController.js';

const router = express.Router();

// Send a message
router.post(
  '/',
  authenticate,
  rateLimiter({ maxRequests: 30, windowMs: 60000 }),
  messageController.sendMessage
);

// Get messages for a conversation
router.get(
  '/:conversationId',
  authenticate,
  messageController.getMessages
);

// Update message
router.put(
  '/:id',
  authenticate,
  messageController.updateMessage
);

// Delete message
router.delete(
  '/:id',
  authenticate,
  messageController.deleteMessage
);

// Mark message as read
router.post(
  '/:id/read',
  authenticate,
  messageController.markAsRead
);

// React to message
router.post(
  '/:id/react',
  authenticate,
  messageController.addReaction
);

export default router;
```

### 5.3 Controller Implementation

```javascript
// src/controllers/conversationController.js
import { conversationService } from '../services/conversationService.js';

export const createConversation = async (req, res, next) => {
  try {
    const { type, title, memberIds, reservationId } = req.body;
    const userId = req.user.id;

    const conversation = await conversationService.createConversation({
      type,
      title,
      createdBy: userId,
      memberIds,
      reservationId
    });

    res.status(201).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const conversations = await conversationService.getUserConversations(
      userId,
      { page, limit }
    );

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await conversationService.getConversationById(
      id,
      userId
    );

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await conversationService.markConversationAsRead(id, userId);

    res.json({
      success: true,
      message: 'Conversation marked as read'
    });
  } catch (error) {
    next(error);
  }
};
```

```javascript
// src/controllers/messageController.js
import { messageService } from '../services/messageService.js';

export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, content, messageType, fileUrl, replyToId } = req.body;
    const userId = req.user.id;

    const message = await messageService.sendMessage({
      conversationId,
      senderId: userId,
      content,
      messageType,
      fileUrl,
      replyToId
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50, before } = req.query;

    const messages = await messageService.getMessages(conversationId, userId, {
      page,
      limit,
      before
    });

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

export const updateMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const message = await messageService.updateMessage(id, userId, { content });

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await messageService.deleteMessage(id, userId);

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    next(error);
  }
};
```

### 5.4 Service Layer

```javascript
// src/services/conversationService.js
import { supabase } from '../config/supabase.js';

export const conversationService = {
  async createConversation({ type, title, createdBy, memberIds, reservationId }) {
    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        type,
        title,
        created_by: createdBy,
        reservation_id: reservationId
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add members
    const members = [createdBy, ...(memberIds || [])].map(userId => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: userId === createdBy ? 'admin' : 'member'
    }));

    const { error: membersError } = await supabase
      .from('conversation_members')
      .insert(members);

    if (membersError) throw membersError;

    return conversation;
  },

  async getUserConversations(userId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_members!inner(user_id),
        messages(count)
      `)
      .eq('conversation_members.user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data;
  },

  async getConversationById(conversationId, userId) {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_members(
          user_id,
          role,
          users(id, name, avatar_url)
        )
      `)
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    // Verify user is a member
    const isMember = data.conversation_members.some(
      m => m.user_id === userId
    );

    if (!isMember) {
      throw new Error('Access denied');
    }

    return data;
  },

  async markConversationAsRead(conversationId, userId) {
    const { error } = await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  }
};
```

```javascript
// src/services/messageService.js
import { supabase } from '../config/supabase.js';

export const messageService = {
  async sendMessage({ conversationId, senderId, content, messageType, fileUrl, replyToId }) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: messageType || 'text',
        file_url: fileUrl,
        reply_to_id: replyToId
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data;
  },

  async getMessages(conversationId, userId, { page = 1, limit = 50, before }) {
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:users(id, name, avatar_url),
        reply_to:messages(id, content, sender_id)
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Verify user is a member
    const { data: member } = await supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      throw new Error('Access denied');
    }

    return data.reverse();
  },

  async updateMessage(messageId, userId, { content }) {
    const { data, error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async deleteMessage(messageId, userId) {
    const { error } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        content: '[Message deleted]'
      })
      .eq('id', messageId)
      .eq('sender_id', userId);

    if (error) throw error;
  },

  async addReaction(messageId, userId, { emoji }) {
    const { data: message } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single();

    const reactions = message.reactions || {};
    const emojiReactions = reactions[emoji] || [];
    
    if (!emojiReactions.includes(userId)) {
      emojiReactions.push(userId);
    }
    
    reactions[emoji] = emojiReactions;

    const { data, error } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;

    return data;
  }
};
```

### 5.5 When to Use REST vs Realtime

**Use REST APIs for:**
- Initial data loading (conversations list, message history)
- File uploads
- Complex operations requiring server-side validation
- Actions that need to be guaranteed (message sending)
- Search and pagination
- Authentication and authorization

**Use Supabase Realtime for:**
- Real-time message updates
- Typing indicators
- Online presence
- Read receipts
- Live conversation updates
- Push notifications

**Hybrid Approach:**
- Load initial data via REST
- Subscribe to realtime updates for changes
- Use optimistic UI for immediate feedback
- Sync with server in background

---

## 6. Frontend (React + Vite)

### 6.1 Folder Structure

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatList.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── MessageInput.jsx
│   │   │   ├── ConversationItem.jsx
│   │   │   ├── TypingIndicator.jsx
│   │   │   └── MessageAttachments.jsx
│   │   ├── common/
│   │   │   ├── Avatar.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   └── layout/
│   │       ├── Header.jsx
│   │       ├── Sidebar.jsx
│   │       └── MainLayout.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   ├── ChatContext.jsx
│   │   └── ThemeContext.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useChat.js
│   │   ├── useMessages.js
│   │   ├── useTypingStatus.js
│   │   └── useOnlineStatus.js
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── realtime.js
│   │   └── utils.js
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── ChatPage.jsx
│   │   └── SettingsPage.jsx
│   ├── services/
│   │   ├── api.js
│   │   ├── chatService.js
│   │   └── fileService.js
│   ├── store/
│   │   ├── chatSlice.js
│   │   ├── messageSlice.js
│   │   └── userSlice.js
│   ├── styles/
│   │   ├── globals.css
│   │   └── chat.css
│   ├── App.jsx
│   └── main.jsx
├── .env
├── .env.example
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### 6.2 Chat Components

#### **ChatList.jsx**

```jsx
import React, { useEffect, useState } from 'react';
import { useChat } from '../hooks/useChat';
import ConversationItem from './ConversationItem';
import LoadingSpinner from '../common/LoadingSpinner';

const ChatList = ({ onConversationSelect, activeConversationId }) => {
  const { conversations, loading, error, fetchConversations } = useChat();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.members?.some(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && conversations.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Messages</h2>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="conversations">
        {filteredConversations.map(conversation => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeConversationId}
            onClick={() => onConversationSelect(conversation)}
          />
        ))}

        {filteredConversations.length === 0 && (
          <div className="empty-state">
            <p>No conversations found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
```

#### **ChatWindow.jsx**

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { useMessages } from '../hooks/useMessages';
import { useTypingStatus } from '../hooks/useTypingStatus';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import LoadingSpinner from '../common/LoadingSpinner';

const ChatWindow = ({ conversation, currentUser }) => {
  const { messages, loading, sendMessage, loadMoreMessages } = useMessages(conversation?.id);
  const { typingUsers } = useTypingStatus(conversation?.id);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isBottom = scrollHeight - scrollTop <= clientHeight + 100;
    setIsAtBottom(isBottom);

    // Load more messages when scrolling near top
    if (scrollTop < 100 && !loading) {
      loadMoreMessages();
    }
  };

  const handleSendMessage = async (content, attachments) => {
    await sendMessage(content, attachments);
    if (!isAtBottom) {
      scrollToBottom();
    }
  };

  if (!conversation) {
    return (
      <div className="chat-window empty">
        <p>Select a conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>{conversation.title || 'Conversation'}</h3>
        <div className="chat-actions">
          {/* Add actions like video call, info, etc. */}
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="messages-container"
      >
        {loading && messages.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <>
            {messages.map(message => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === currentUser.id}
                currentUser={currentUser}
              />
            ))}

            {typingUsers.length > 0 && (
              <TypingIndicator users={typingUsers} />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        conversationId={conversation.id}
        disabled={loading}
      />
    </div>
  );
};

export default ChatWindow;
```

#### **MessageBubble.jsx**

```jsx
import React from 'react';
import { formatMessageTime } from '../lib/utils';

const MessageBubble = ({ message, isOwn, currentUser }) => {
  const { content, sender, created_at, file_url, message_type, reactions, reply_to } = message;

  const renderContent = () => {
    if (message_type === 'image' && file_url) {
      return (
        <div className="message-image">
          <img src={file_url} alt="Shared image" />
        </div>
      );
    }

    if (message_type === 'file' && file_url) {
      return (
        <a href={file_url} target="_blank" rel="noopener noreferrer" className="message-file">
          <span>📎 {content || 'Download file'}</span>
        </a>
      );
    }

    return <p className="message-text">{content}</p>;
  };

  const renderReactions = () => {
    if (!reactions || Object.keys(reactions).length === 0) return null;

    return (
      <div className="message-reactions">
        {Object.entries(reactions).map(([emoji, users]) => (
          <span key={emoji} className="reaction">
            {emoji} {users.length}
          </span>
        ))}
      </div>
    );
  };

  const renderReply = () => {
    if (!reply_to) return null;

    return (
      <div className="message-reply">
        <span className="reply-author">
          {reply_to.sender_id === currentUser.id ? 'You' : reply_to.sender?.name}
        </span>
        <span className="reply-content">{reply_to.content}</span>
      </div>
    );
  };

  return (
    <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && (
        <div className="message-sender">
          <img src={sender?.avatar_url} alt={sender?.name} className="avatar" />
          <span className="sender-name">{sender?.name}</span>
        </div>
      )}

      {renderReply()}

      <div className="message-content">
        {renderContent()}
        {renderReactions()}
      </div>

      <div className="message-meta">
        <span className="message-time">{formatMessageTime(created_at)}</span>
        {message.status === 'read' && isOwn && (
          <span className="message-status">✓✓</span>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
```

#### **MessageInput.jsx**

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { useTypingStatus } from '../hooks/useTypingStatus';

const MessageInput = ({ onSendMessage, conversationId, disabled }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { setTypingStatus } = useTypingStatus(conversationId);

  useEffect(() => {
    if (message.length > 0 && !isTyping) {
      setIsTyping(true);
      setTypingStatus(true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingStatus(false);
    }, 1000);

    return () => clearTimeout(typingTimeoutRef.current);
  }, [message, conversationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;

    await onSendMessage(message, attachments);
    setMessage('');
    setAttachments([]);
    setTypingStatus(false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="message-input-container">
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map((file, index) => (
            <div key={index} className="attachment-item">
              <span>{file.name}</span>
              <button onClick={() => removeAttachment(index)}>×</button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="message-input-form">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="attach-button"
          disabled={disabled}
        >
          📎
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={disabled}
          className="message-input"
        />

        <button
          type="submit"
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
```

#### **ConversationItem.jsx**

```jsx
import React from 'react';
import { formatMessageTime, getUnreadCount } from '../lib/utils';

const ConversationItem = ({ conversation, isActive, onClick }) => {
  const { title, members, updated_at, last_message } = conversation;
  const unreadCount = getUnreadCount(conversation);

  const getAvatar = () => {
    if (conversation.type === 'direct' && members?.length > 0) {
      const otherMember = members.find(m => m.id !== conversation.current_user_id);
      return otherMember?.avatar_url;
    }
    return null;
  };

  const getDisplayName = () => {
    if (title) return title;
    if (conversation.type === 'direct' && members?.length > 0) {
      const otherMember = members.find(m => m.id !== conversation.current_user_id);
      return otherMember?.name || 'Unknown';
    }
    return 'Conversation';
  };

  const getLastMessage = () => {
    if (last_message) {
      return last_message.content || (last_message.message_type !== 'text' ? '📎 Attachment' : '');
    }
    return 'No messages yet';
  };

  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="conversation-avatar">
        {getAvatar() ? (
          <img src={getAvatar()} alt={getDisplayName()} />
        ) : (
          <div className="avatar-placeholder">
            {getDisplayName().charAt(0).toUpperCase()}
          </div>
        )}
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </div>

      <div className="conversation-info">
        <div className="conversation-header">
          <h4>{getDisplayName()}</h4>
          <span className="conversation-time">
            {formatMessageTime(updated_at)}
          </span>
        </div>
        <p className="conversation-preview">{getLastMessage()}</p>
      </div>
    </div>
  );
};

export default ConversationItem;
```

### 6.3 Custom Hooks

#### **useChat.js**

```javascript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { chatService } from '../services/chatService';

export const useChat = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToConversations = () => {
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
            setConversations(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev =>
              prev.map(conv =>
                conv.id === payload.new.id ? payload.new : conv
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev =>
              prev.filter(conv => conv.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    fetchConversations();
    const unsubscribe = subscribeToConversations();
    return unsubscribe;
  }, []);

  return {
    conversations,
    loading,
    error,
    fetchConversations,
    refetch: fetchConversations
  };
};
```

#### **useMessages.js**

```javascript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { messageService } from '../services/messageService';
import realtimeManager from '../lib/realtime';

export const useMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchMessages = useCallback(async (before = null) => {
    if (!conversationId) return;

    try {
      setLoading(true);
      const data = await messageService.getMessages(conversationId, { before });

      if (before) {
        setMessages(prev => [...data, ...prev]);
      } else {
        setMessages(data);
      }

      setHasMore(data.length >= 50);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const sendMessage = async (content, attachments = []) => {
    if (!conversationId) return;

    // Optimistic update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: supabase.auth.user()?.id,
      content,
      message_type: attachments.length > 0 ? 'file' : 'text',
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      // Upload attachments if any
      let fileUrl = null;
      if (attachments.length > 0) {
        fileUrl = await messageService.uploadFile(attachments[0], conversationId);
      }

      const newMessage = await messageService.sendMessage({
        conversationId,
        content,
        fileUrl,
        messageType: attachments.length > 0 ? 'file' : 'text'
      });

      // Replace temp message with real message
      setMessages(prev =>
        prev.map(msg => (msg.id === tempMessage.id ? newMessage : msg))
      );
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      throw error;
    }
  };

  const loadMoreMessages = useCallback(() => {
    if (!hasMore || loading) return;
    const oldestMessage = messages[0];
    fetchMessages(oldestMessage?.created_at);
  }, [hasMore, loading, messages, fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;

    fetchMessages();

    // Subscribe to realtime updates
    const channel = realtimeManager.subscribeToConversation(conversationId, {
      onInsert: (payload) => {
        setMessages(prev => {
          // Avoid duplicate messages
          if (prev.some(m => m.id === payload.new.id)) {
            return prev;
          }
          return [...prev, payload.new];
        });
      },
      onUpdate: (payload) => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === payload.new.id ? payload.new : msg
          )
        );
      },
      onDelete: (payload) => {
        setMessages(prev =>
          prev.filter(msg => msg.id !== payload.old.id)
        );
      }
    });

    return () => {
      realtimeManager.unsubscribe(conversationId);
    };
  }, [conversationId, fetchMessages]);

  return {
    messages,
    loading,
    hasMore,
    sendMessage,
    loadMoreMessages,
    fetchMessages
  };
};
```

#### **useTypingStatus.js**

```javascript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useTypingStatus = (conversationId) => {
  const [typingUsers, setTypingUsers] = useState([]);
  const currentUserId = supabase.auth.user()?.id;

  const setTypingStatus = useCallback(async (isTyping) => {
    if (!conversationId || !currentUserId) return;

    const { error } = await supabase
      .from('typing_status')
      .upsert({
        conversation_id: conversationId,
        user_id: currentUserId,
        is_typing: isTyping,
        updated_at: new Date().toISOString()
      });

    if (error) console.error('Error setting typing status:', error);
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to typing status changes
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setTypingUsers(prev => {
              const users = prev.filter(u => u.user_id !== payload.new.user_id);
              if (payload.new.is_typing && payload.new.user_id !== currentUserId) {
                return [...users, payload.new];
              }
              return users;
            });
          } else if (payload.eventType === 'DELETE') {
            setTypingUsers(prev =>
              prev.filter(u => u.user_id !== payload.old.user_id)
            );
          }
        }
      )
      .subscribe();

    // Clean up typing status on unmount
    return () => {
      setTypingStatus(false);
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, setTypingStatus]);

  return {
    typingUsers,
    setTypingStatus
  };
};
```

### 6.4 State Management

For larger applications, consider using Redux Toolkit or Zustand. Here's a simple Zustand example:

```javascript
// src/store/chatStore.js
import create from 'zustand';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: {},
  typingStatus: {},

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (conversation) => set({ activeConversation: conversation }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages }
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message]
      }
    })),

  setTypingStatus: (conversationId, users) =>
    set((state) => ({
      typingStatus: { ...state.typingStatus, [conversationId]: users }
    }))
}));
```

### 6.5 Optimistic UI Updates

Optimistic UI updates improve perceived performance by updating the UI immediately before the server confirms the action.

```javascript
const sendMessage = async (content) => {
  // Create temporary message
  const tempMessage = {
    id: `temp-${Date.now()}`,
    content,
    sender_id: currentUser.id,
    created_at: new Date().toISOString(),
    status: 'sending'
  };

  // Update UI immediately (optimistic)
  setMessages(prev => [...prev, tempMessage]);

  try {
    // Send to server
    const realMessage = await messageService.sendMessage({
      conversationId,
      content
    });

    // Replace temp with real message
    setMessages(prev =>
      prev.map(msg => (msg.id === tempMessage.id ? realMessage : msg))
    );
  } catch (error) {
    // Revert on error
    setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    throw error;
  }
};
```

---

## 7. Messaging Features

### 7.1 Real-time Messages

Real-time messaging is handled through Supabase Realtime subscriptions. Messages are broadcast to all conversation members instantly.

**Implementation:**
- Subscribe to INSERT events on messages table
- Filter by conversation_id
- Update UI immediately on new message
- Handle connection errors and reconnection

### 7.2 Typing Indicator

Typing indicators show when someone is composing a message.

**Implementation:**
```javascript
// Set typing status when user types
const handleTyping = () => {
  setTypingStatus(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => setTypingStatus(false), 1000);
};

// Display typing indicator
{typingUsers.length > 0 && (
  <TypingIndicator users={typingUsers} />
)}
```

### 7.3 Read Receipts

Track when messages are read by recipients.

**Implementation:**
```javascript
// Mark message as read
const markAsRead = async (messageId) => {
  await supabase
    .from('messages')
    .update({
      status: 'read',
      read_by: supabase.raw('array_append(read_by, ?)', [currentUser.id])
    })
    .eq('id', messageId);
};

// Update conversation member's last_read_at
await supabase
  .from('conversation_members')
  .update({ last_read_at: new Date().toISOString() })
  .eq('conversation_id', conversationId)
  .eq('user_id', currentUser.id);
```

### 7.4 Delivered Status

Show when messages are delivered to recipients.

**Implementation:**
- Use UPDATE events to track status changes
- Display single check for sent, double check for delivered
- Update status when all members have received the message

### 7.5 Online/Offline Presence

Track user online status.

**Implementation:**
```javascript
// Set online status on mount
useEffect(() => {
  const setOnline = async () => {
    await supabase
      .from('online_users')
      .upsert({
        user_id: currentUser.id,
        last_active: new Date().toISOString()
      });
  };

  setOnline();
  const interval = setInterval(setOnline, 30000); // Every 30 seconds

  return () => {
    clearInterval(interval);
    // Set offline on unmount
    supabase.from('online_users').delete().eq('user_id', currentUser.id);
  };
}, [currentUser.id]);
```

### 7.6 Last Seen

Show when user was last active.

**Implementation:**
```javascript
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Never';
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(lastSeen).toLocaleDateString();
};
```

### 7.7 Auto-scroll

Automatically scroll to newest message.

**Implementation:**
```javascript
const messagesEndRef = useRef(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);

// In JSX
<div ref={messagesEndRef} />
```

### 7.8 Infinite Scrolling

Load older messages when scrolling to top.

**Implementation:**
```javascript
const handleScroll = (e) => {
  const { scrollTop } = e.target;
  if (scrollTop < 100 && hasMore && !loading) {
    loadMoreMessages();
  }
};
```

### 7.9 Pagination

Paginate message loading for performance.

**Implementation:**
```javascript
const getMessages = async (conversationId, { page = 1, limit = 50 }) => {
  const offset = (page - 1) * limit;
  
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return data.reverse();
};
```

### 7.10 Search Messages

Search within conversations.

**Implementation:**
```javascript
const searchMessages = async (conversationId, query) => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false });

  return data;
};
```

### 7.11 Unread Badge

Show unread message count.

**Implementation:**
```javascript
const getUnreadCount = (conversation) => {
  const lastReadAt = conversation.members?.find(
    m => m.user_id === currentUser.id
  )?.last_read_at;

  if (!lastReadAt) return conversation.message_count || 0;

  return conversation.messages?.filter(
    m => new Date(m.created_at) > new Date(lastReadAt)
  ).length || 0;
};
```

### 7.12 Notifications

Push notifications for new messages.

**Implementation:**
```javascript
// Request notification permission
const requestNotificationPermission = async () => {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // Subscribe to push notifications
    const { data } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: currentUser.id,
        subscription: await subscribeToPush()
      });
  }
};

// Show notification
const showNotification = (message) => {
  if (document.hidden) {
    new Notification('New Message', {
      body: message.content,
      icon: message.sender?.avatar_url
    });
  }
};
```

---

## 8. File Sharing

### 8.1 Upload Images to Supabase Storage

```javascript
// src/services/fileService.js
import { supabase } from '../lib/supabase';

export const uploadImage = async (file, conversationId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
  const filePath = `chat-images/${fileName}`;

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-files')
    .getPublicUrl(filePath);

  return publicUrl;
};
```

### 8.2 Upload PDFs

```javascript
export const uploadPDF = async (file, conversationId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
  const filePath = `chat-documents/${fileName}`;

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-files')
    .getPublicUrl(filePath);

  return publicUrl;
};
```

### 8.3 Upload Videos

```javascript
export const uploadVideo = async (file, conversationId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
  const filePath = `chat-videos/${fileName}`;

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-files')
    .getPublicUrl(filePath);

  return publicUrl;
};
```

### 8.4 Save URLs in Messages Table

```javascript
const sendMessageWithAttachment = async (conversationId, file) => {
  let fileUrl = null;
  let messageType = 'text';

  if (file) {
    if (file.type.startsWith('image/')) {
      fileUrl = await uploadImage(file, conversationId);
      messageType = 'image';
    } else if (file.type === 'application/pdf') {
      fileUrl = await uploadPDF(file, conversationId);
      messageType = 'file';
    } else if (file.type.startsWith('video/')) {
      fileUrl = await uploadVideo(file, conversationId);
      messageType = 'video';
    }
  }

  const { data } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content: file?.name || '',
      message_type: messageType,
      file_url: fileUrl
    });

  return data;
};
```

### 8.5 Display Previews

```jsx
const MessageAttachment = ({ message }) => {
  const { message_type, file_url, content } = message;

  if (message_type === 'image' && file_url) {
    return (
      <img
        src={file_url}
        alt="Shared image"
        className="message-image"
        onClick={() => window.open(file_url, '_blank')}
      />
    );
  }

  if (message_type === 'video' && file_url) {
    return (
      <video controls className="message-video">
        <source src={file_url} />
      </video>
    );
  }

  if (message_type === 'file' && file_url) {
    return (
      <a href={file_url} target="_blank" rel="noopener noreferrer" className="file-link">
        <span>📎 {content || 'Download file'}</span>
      </a>
    );
  }

  return null;
};
```

### 8.6 Storage Security Policies

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);

-- Storage RLS policies
CREATE POLICY "Users can upload to their conversations"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can read chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 9. Reservation Integration

### 9.1 Auto-create Conversation on Reservation

```javascript
// backend/services/reservationService.js
export const reservationService = {
  async createReservation(reservationData) {
    // Create reservation
    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert({
        customer_id: reservationData.customerId,
        staff_id: reservationData.staffId,
        status: 'pending',
        reservation_data: reservationData
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-create conversation
    await this.createReservationConversation(reservation);

    return reservation;
  },

  async createReservationConversation(reservation) {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        type: 'reservation',
        title: `Reservation #${reservation.id}`,
        created_by: reservation.staff_id,
        reservation_id: reservation.id
      })
      .select()
      .single();

    if (error) throw error;

    // Add customer and staff as members
    await supabase.from('conversation_members').insert([
      {
        conversation_id: conversation.id,
        user_id: reservation.customer_id,
        role: 'customer'
      },
      {
        conversation_id: conversation.id,
        user_id: reservation.staff_id,
        role: 'staff'
      }
    ]);

    return conversation;
  }
};
```

### 9.2 Restrict Access to Assigned Staff and Customer

```sql
-- RLS policy for reservation conversations
CREATE POLICY "Only assigned staff and customer can access reservation conversations"
ON conversations FOR SELECT
USING (
  type != 'reservation' OR
  EXISTS (
    SELECT 1 FROM conversation_members cm
    JOIN reservations r ON r.id = conversations.reservation_id
    WHERE cm.conversation_id = conversations.id
    AND cm.user_id = auth.uid()
    AND (
      cm.user_id = r.customer_id OR
      cm.user_id = r.staff_id
    )
  )
);
```

### 9.3 Link Reservations with Conversations

```javascript
// Get conversation for a reservation
const getReservationConversation = async (reservationId) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('reservation_id', reservationId)
    .single();

  if (error) throw error;

  return data;
};

// Get reservation from conversation
const getConversationReservation = async (conversationId) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, reservations(*)')
    .eq('id', conversationId)
    .single();

  if (error) throw error;

  return data.reservations;
};
```

---

## 10. Security

### 10.1 Authentication Flow

```javascript
// src/lib/auth.js
import { supabase } from './supabase';

export const authService = {
  async signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) throw error;

    // Create user profile
    await supabase.from('users').insert({
      id: data.user.id,
      email,
      name
    });

    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Update last seen
    await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', data.user.id);

    return data;
  },

  async signOut() {
    // Clear online status
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('online_users').delete().eq('user_id', user.id);
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }
};
```

### 10.2 Authorization

Authorization is handled through RLS policies on the database level. Each table has policies that ensure users can only access data they're authorized to see.

### 10.3 Prevent Access to Other Conversations

```sql
-- Ensure users can only access conversations they're members of
CREATE POLICY "Users can only access their conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = messages.conversation_id
    AND conversation_members.user_id = auth.uid()
  )
);
```

### 10.4 Validate Uploads

```javascript
// src/services/fileValidation.js
export const validateFile = (file) => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/webm'
  ];

  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds 10MB limit');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('File type not allowed');
  }

  return true;
};

// Usage
const handleFileUpload = async (file) => {
  try {
    validateFile(file);
    const url = await uploadFile(file);
    return url;
  } catch (error) {
    console.error('File validation failed:', error);
    throw error;
  }
};
```

### 10.5 Prevent Spam

```javascript
// Rate limiting middleware
import rateLimit from 'express-rate-limit';

export const messageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: 'Too many messages, please slow down',
  standardHeaders: true,
  legacyHeaders: false
});

// Apply to message routes
router.post('/', authenticate, messageRateLimit, messageController.sendMessage);
```

### 10.6 Rate Limiting Recommendations

```javascript
// Different rate limits for different endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 attempts
});

const conversationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 conversations per minute
});

const fileUploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5 // 5 uploads per minute
});
```

---

## 11. Performance

### 11.1 Indexing Strategy

Critical indexes for performance:
- `messages(conversation_id, created_at DESC)` - For message pagination
- `conversation_members(conversation_id, user_id)` - For membership checks
- `conversation_members(user_id)` - For user's conversation list
- `messages(sender_id)` - For user's sent messages
- `typing_status(conversation_id, updated_at)` - For typing indicator cleanup

### 11.2 Pagination

Use cursor-based pagination for infinite scrolling:

```javascript
const getMessages = async (conversationId, { limit = 50, cursor }) => {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data } = await query;
  return data.reverse();
};
```

### 11.3 Lazy Loading

Load conversations and messages lazily:

```javascript
// Load conversations on demand
const loadConversation = async (conversationId) => {
  if (!loadedConversations.has(conversationId)) {
    const messages = await fetchMessages(conversationId);
    loadedConversations.set(conversationId, messages);
  }
  return loadedConversations.get(conversationId);
};
```

### 11.4 Efficient Realtime Subscriptions

Subscribe only to necessary data:

```javascript
// Good: Specific filter
supabase
  .channel('conversation:123')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: 'conversation_id=eq.123'
  }, callback)
  .subscribe();

// Bad: No filter (receives all messages)
supabase
  .channel('all-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages'
  }, callback)
  .subscribe();
```

### 11.5 Minimize Re-renders

Use React.memo and useMemo:

```javascript
const MessageBubble = React.memo(({ message, isOwn }) => {
  // Component implementation
});

// Use useMemo for expensive computations
const sortedMessages = useMemo(() => {
  return messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}, [messages]);
```

### 11.6 Scale for Thousands of Concurrent Users

**Database:**
- Use connection pooling
- Enable read replicas
- Implement caching with Redis
- Use CDN for static assets

**Application:**
- Horizontal scaling with load balancers
- WebSocket connection management
- Queue system for notifications
- Database query optimization

**Supabase:**
- Enable Supabase Edge Functions for serverless logic
- Use Supabase Realtime presence features
- Implement proper RLS to reduce data transfer
- Use Supabase Storage CDN

---

## 12. Production Deployment

### 12.1 Vercel Deployment

**Backend (Vercel):**

```javascript
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "src/app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/src/app.js"
    }
  ],
  "env": {
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key"
  }
}
```

**Frontend (Vercel):**

```javascript
// vite.config.js
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000
  }
});
```

### 12.2 Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend (.env):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-api.vercel.app
```

### 12.3 Supabase Configuration

**Production Settings:**
- Enable RLS on all tables
- Use service role key only on server
- Enable database backups
- Configure log retention
- Set up monitoring alerts
- Enable SSL/TLS
- Configure CORS properly

### 12.4 Monitoring

**Supabase Dashboard:**
- Monitor database performance
- Track realtime connections
- Monitor storage usage
- Set up error tracking

**Application Monitoring:**
```javascript
// src/utils/monitoring.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

// Log errors
export const logError = (error, context = {}) => {
  console.error('Error:', error, context);
  Sentry.captureException(error, { extra: context });
};
```

### 12.5 Logging

```javascript
// src/utils/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### 12.6 Backup Strategy

**Supabase:**
- Enable daily automated backups
- Configure point-in-time recovery
- Export data regularly
- Test restore procedures

**Application:**
- Backup environment variables
- Version control all configuration
- Document deployment process
- Have rollback plan ready

---

## 13. Best Practices

### 13.1 Error Handling

```javascript
// Global error handler
export const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
};

// Frontend error boundary
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
```

### 13.2 Folder Organization

Follow the structure outlined in sections 5 and 6. Keep related files together and maintain clear separation of concerns.

### 13.3 Clean Architecture

```
- Presentation Layer: React components
- Business Logic Layer: Services and hooks
- Data Access Layer: Supabase client and API calls
- Domain Layer: Models and types
```

### 13.4 Reusable Components

```javascript
// Example: Reusable Button component
const Button = ({ children, variant = 'primary', size = 'medium', ...props }) => {
  const baseStyles = 'rounded font-semibold transition-colors';
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  };
  const sizes = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

### 13.5 Naming Conventions

- **Files**: kebab-case (e.g., `message-bubble.jsx`)
- **Components**: PascalCase (e.g., `MessageBubble`)
- **Functions**: camelCase (e.g., `sendMessage`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
- **Database tables**: snake_case (e.g., `conversation_members`)

### 13.6 Maintainability

- Write comprehensive comments
- Keep functions small and focused
- Use TypeScript for type safety
- Write unit and integration tests
- Document API endpoints
- Use semantic versioning
- Regular code reviews

---

## 14. Bonus Features

### 14.1 Message Reactions

```javascript
// Add reaction to message
const addReaction = async (messageId, emoji) => {
  const { data: message } = await supabase
    .from('messages')
    .select('reactions')
    .eq('id', messageId)
    .single();

  const reactions = message.reactions || {};
  const emojiReactions = reactions[emoji] || [];
  
  if (!emojiReactions.includes(currentUser.id)) {
    emojiReactions.push(currentUser.id);
  }
  
  reactions[emoji] = emojiReactions;

  await supabase
    .from('messages')
    .update({ reactions })
    .eq('id', messageId);
};
```

### 14.2 Reply to Messages

```javascript
// Reply to message
const replyToMessage = async (messageId, content) => {
  await supabase
    .from('messages')
    .insert({
      conversation_id: activeConversation.id,
      sender_id: currentUser.id,
      content,
      reply_to_id: messageId
    });
};
```

### 14.3 Edit/Delete Messages

```javascript
// Edit message
const editMessage = async (messageId, newContent) => {
  await supabase
    .from('messages')
    .update({ content: newContent })
    .eq('id', messageId)
    .eq('sender_id', currentUser.id);
};

// Delete message (soft delete)
const deleteMessage = async (messageId) => {
  await supabase
    .from('messages')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      content: '[Message deleted]'
    })
    .eq('id', messageId)
    .eq('sender_id', currentUser.id);
};
```

### 14.4 Pin Conversations

```sql
ALTER TABLE conversation_members ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;

-- Update RLS policy
CREATE POLICY "Users can pin their conversations"
ON conversation_members FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

```javascript
const pinConversation = async (conversationId) => {
  await supabase
    .from('conversation_members')
    .update({ is_pinned: true })
    .eq('conversation_id', conversationId)
    .eq('user_id', currentUser.id);
};
```

### 14.5 Archive Conversations

```sql
ALTER TABLE conversation_members ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
```

```javascript
const archiveConversation = async (conversationId) => {
  await supabase
    .from('conversation_members')
    .update({ is_archived: true })
    .eq('conversation_id', conversationId)
    .eq('user_id', currentUser.id);
};
```

### 14.6 Group Chats

```javascript
// Create group chat
const createGroupChat = async (name, memberIds) => {
  const { data: conversation } = await supabase
    .from('conversations')
    .insert({
      type: 'group',
      title: name,
      created_by: currentUser.id
    })
    .select()
    .single();

  // Add members
  const members = [currentUser.id, ...memberIds].map(userId => ({
    conversation_id: conversation.id,
    user_id: userId,
    role: userId === currentUser.id ? 'admin' : 'member'
  }));

  await supabase.from('conversation_members').insert(members);

  return conversation;
};
```

### 14.7 Push Notifications

```javascript
// Subscribe to push notifications
const subscribeToPush = async () => {
  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY
  });

  await supabase.from('push_subscriptions').insert({
    user_id: currentUser.id,
    subscription: JSON.stringify(subscription)
  });

  return subscription;
};
```

### 14.8 Emoji Support

```jsx
import EmojiPicker from 'emoji-picker-react';

const MessageInput = ({ onSendMessage }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className="message-input">
      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
        😊
      </button>
      {showEmojiPicker && (
        <EmojiPicker
          onEmojiClick={(emojiData) => {
            setMessage(prev => prev + emojiData.emoji);
            setShowEmojiPicker(false);
          }}
        />
      )}
      {/* Rest of input */}
    </div>
  );
};
```

### 14.9 Voice Messages

```javascript
const recordVoiceMessage = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const file = new File([blob], 'voice-message.webm', { type: 'audio/webm' });
    const url = await uploadVoiceMessage(file);
    await sendMessage('', url, 'audio');
  };

  mediaRecorder.start();
  // Stop recording after user action
};
```

---

## Common Mistakes to Avoid

1. **Not unsubscribing from realtime channels** - Always cleanup on unmount
2. **Missing RLS policies** - Security vulnerability
3. **N+1 queries** - Use proper joins and selects
4. **Not handling connection errors** - Implement reconnection logic
5. **Missing indexes** - Performance issues at scale
6. **Hardcoding sensitive data** - Use environment variables
7. **Not validating inputs** - Security risk
8. **Ignoring error handling** - Poor user experience
9. **Over-fetching data** - Select only needed columns
10. **Not implementing rate limiting** - Vulnerable to abuse

## Scalability Tips

1. **Use connection pooling** for database connections
2. **Implement caching** with Redis for frequently accessed data
3. **Use CDN** for static assets and file delivery
4. **Implement pagination** for all list endpoints
5. **Use WebSocket presence** for online status instead of polling
6. **Queue heavy operations** like notifications
7. **Monitor performance** regularly
8. **Load test** before production
9. **Use read replicas** for read-heavy operations
10. **Implement proper logging** for debugging

---

## Conclusion

This guide provides a comprehensive foundation for building a production-ready real-time messaging system with React, Node.js, and Supabase. The architecture is designed to scale to thousands of concurrent users while maintaining security, performance, and a great user experience.

Remember to:
- Test thoroughly before production
- Monitor performance continuously
- Keep security as a priority
- Document your changes
- Plan for scalability from the start

Good luck with your messaging system!
