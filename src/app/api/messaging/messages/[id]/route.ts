import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:users(id, name, avatar_url),
        reply_to:messages(id, content, sender_id)
      `)
      .eq('conversation_id', params.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Verify user is a member
    const { data: member } = await supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: data?.reverse() || [] });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, action } = body;

    if (action === 'react') {
      const { emoji } = body;
      
      const { data: message } = await supabase
        .from('messages')
        .select('reactions')
        .eq('id', params.id)
        .single();

      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      const reactions = message.reactions || {};
      const emojiReactions = reactions[emoji] || [];
      
      if (!emojiReactions.includes(user.id)) {
        emojiReactions.push(user.id);
      } else {
        reactions[emoji] = emojiReactions.filter((id: string) => id !== user.id);
      }
      
      reactions[emoji] = emojiReactions;

      const { data, error } = await supabase
        .from('messages')
        .update({ reactions })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    }

    if (action === 'mark_read') {
      const { error } = await supabase
        .from('messages')
        .update({
          status: 'read'
        })
        .eq('id', params.id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Message marked as read' });
    }

    // Default: update message content
    const { data, error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', params.id)
      .eq('sender_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        content: '[Message deleted]'
      })
      .eq('id', params.id)
      .eq('sender_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
