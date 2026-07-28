-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extend existing auth.users if needed)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    last_seen TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    type VARCHAR(50) NOT NULL DEFAULT 'direct', -- 'direct', 'group', 'reservation'
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add reservation_id column if it doesn't exist (for reservation integration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'reservation_id'
    ) THEN
        ALTER TABLE public.conversations ADD COLUMN reservation_id UUID;
    END IF;
END $$;

-- Conversation members table
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member', 'staff', 'customer'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'video', 'file', 'audio'
    file_url TEXT,
    file_metadata JSONB DEFAULT '{}',
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'delivered', 'read'
    read_by JSONB DEFAULT '[]', -- Array of user IDs who read the message
    reactions JSONB DEFAULT '{}',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Typing status table
CREATE TABLE IF NOT EXISTS public.typing_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Online users table
CREATE TABLE IF NOT EXISTS public.online_users (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    socket_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'
);

-- Reservations table (for integration)
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    reservation_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users(last_seen);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON public.users(is_online);

CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);

-- Add reservation_id index if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'reservation_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_conversations_reservation_id ON public.conversations(reservation_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_role ON public.conversation_members(role);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_typing_status_conversation_id ON public.typing_status(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_user_id ON public.typing_status(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_updated_at ON public.typing_status(updated_at);

CREATE INDEX IF NOT EXISTS idx_online_users_last_active ON public.online_users(last_active);

CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_staff_id ON public.reservations(staff_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Service role can insert users"
    ON public.users FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for conversations
CREATE POLICY "Users can read own conversations"
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE public.conversation_members.conversation_id = public.conversations.id
            AND public.conversation_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE public.conversation_members.conversation_id = public.conversations.id
            AND public.conversation_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Conversation admins can update"
    ON public.conversations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE public.conversation_members.conversation_id = public.conversations.id
            AND public.conversation_members.user_id = auth.uid()
            AND public.conversation_members.role IN ('admin')
        )
    );

-- RLS Policies for conversation members
CREATE POLICY "Users can read conversation members"
    ON public.conversation_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members cm
            WHERE cm.conversation_id = public.conversation_members.conversation_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join conversations"
    ON public.conversation_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own membership"
    ON public.conversation_members FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage members"
    ON public.conversation_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members cm
            WHERE cm.conversation_id = public.conversation_members.conversation_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
    );

-- RLS Policies for messages
CREATE POLICY "Users can read own conversation messages"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE public.conversation_members.conversation_id = public.messages.conversation_id
            AND public.conversation_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE public.conversation_members.conversation_id = public.messages.conversation_id
            AND public.conversation_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own messages"
    ON public.messages FOR UPDATE
    USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own messages"
    ON public.messages FOR DELETE
    USING (sender_id = auth.uid());

-- RLS Policies for typing status
CREATE POLICY "Users can read typing status"
    ON public.typing_status FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members
            WHERE public.conversation_members.conversation_id = public.typing_status.conversation_id
            AND public.conversation_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own typing status"
    ON public.typing_status FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own typing status"
    ON public.typing_status FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own typing status"
    ON public.typing_status FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for online users
CREATE POLICY "Users can read online status"
    ON public.online_users FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own online status"
    ON public.online_users FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own online status"
    ON public.online_users FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own online status"
    ON public.online_users FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for reservations
CREATE POLICY "Customers can read own reservations"
    ON public.reservations FOR SELECT
    USING (customer_id = auth.uid());

CREATE POLICY "Staff can read assigned reservations"
    ON public.reservations FOR SELECT
    USING (staff_id = auth.uid());

CREATE POLICY "Service role can manage reservations"
    ON public.reservations FOR ALL
    USING (auth.role() = 'service_role');

-- Functions and Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_on_message ON public.messages;
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

CREATE OR REPLACE FUNCTION public.cleanup_old_typing_status()
RETURNS void AS $$
BEGIN
    DELETE FROM public.typing_status
    WHERE updated_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Enable realtime replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;
