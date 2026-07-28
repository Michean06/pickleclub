# Messaging System Setup Guide

Follow these steps to set up the messaging system in your Supabase project.

## Step 1: Run SQL Migration in Supabase

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project (dcspwvfoiguaculukvdw)

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration Script**
   - Open the file: `supabase/migrations/001_create_messaging_tables.sql`
   - Copy the entire content of the file
   - Paste it into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify the Migration**
   - You should see "Success" in the results
   - Check that the following tables were created:
     - `public.users`
     - `public.conversations`
     - `public.conversation_members`
     - `public.messages`
     - `public.typing_status`
     - `public.online_users`
     - `public.reservations`

## Step 2: Create Storage Bucket

1. **Navigate to Storage**
   - In Supabase Dashboard, click "Storage" in the left sidebar

2. **Create New Bucket**
   - Click "Create a new bucket"
   - Name the bucket: `chat-files`
   - Make it **Public** (check the "Public bucket" option)
   - Click "Create bucket"

3. **Configure Bucket Policies (Optional)**
   - The migration script includes RLS policies for the database
   - For storage, you may want to add additional policies in Production
   - For development, public access is sufficient

## Step 3: Enable Realtime Replication

The migration script already includes the following commands to enable realtime:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;
```

**Verify Realtime is Enabled:**
1. In Supabase Dashboard, click "Replication" in the left sidebar
2. You should see the following tables listed under "supabase_realtime":
   - messages
   - conversations
   - conversation_members
   - typing_status

If any are missing, manually add them:
1. Click "Add table"
2. Select the missing table
3. Click "Confirm"

## Step 4: Access the Messaging System

1. **Start Your Development Server**
   ```bash
   npm run dev
   ```

2. **Navigate to Messaging Page**
   - Open your browser to: http://localhost:4028/messaging
   - Or if deployed: https://pickleclub6750.builtwithrocket.new/messaging

3. **Test the System**
   - Make sure you're logged in (uses existing authentication)
   - You should see the messaging interface
   - Try creating a conversation and sending a message

## Step 5: Create Test Data (Optional)

If you want to test with sample data, run this in the SQL Editor:

```sql
-- Create a test user profile (if not exists)
INSERT INTO public.users (id, email, name, avatar_url)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT email FROM auth.users LIMIT 1),
  'Test User',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Create a test conversation
INSERT INTO public.conversations (type, title, created_by)
VALUES (
  'direct',
  'Test Conversation',
  (SELECT id FROM auth.users LIMIT 1)
)
RETURNING id;

-- Add yourself as a member
INSERT INTO public.conversation_members (conversation_id, user_id, role)
SELECT 
  (SELECT id FROM public.conversations ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'admin';
```

## Troubleshooting

### Migration Fails
- **Error**: "relation already exists"
  - **Solution**: The tables already exist. You can skip this step or drop existing tables first.

- **Error**: "extension uuid-ossp already exists"
  - **Solution**: This is normal, the script uses IF NOT EXISTS

### Storage Bucket Issues
- **Error**: "Bucket already exists"
  - **Solution**: The bucket already exists, you can use the existing one.

- **Error**: File upload fails
  - **Solution**: Make sure the bucket is public and you have the correct RLS policies.

### Realtime Not Working
- **Messages not appearing in real-time**
  - **Solution**: Check that realtime is enabled for the tables in the Replication tab
  - **Solution**: Check browser console for WebSocket errors

### Authentication Issues
- **Error**: "Unauthorized" when accessing API
  - **Solution**: Make sure you're logged in and the auth session is valid
  - **Solution**: Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are correct

## Next Steps

After setup is complete:

1. **Test Core Features**
   - Send messages
   - Test typing indicators
   - Upload files
   - Create new conversations

2. **Customize for Your Needs**
   - Modify the UI components in `src/components/messaging/`
   - Add custom message types
   - Implement additional features (push notifications, voice messages, etc.)

3. **Production Considerations**
   - Add rate limiting to API routes
   - Implement proper error handling
   - Set up monitoring and logging
   - Configure backup strategies

## Support

For detailed implementation guidance, refer to:
- `MESSAGING_SYSTEM_GUIDE.md` - Complete implementation guide
- Supabase Documentation: https://supabase.com/docs
