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

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_members(
          user_id,
          role,
          joined_at,
          last_read_at,
          users(id, name, avatar_url)
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) throw error;

    // Verify user is a member
    const isMember = data.conversation_members.some(
      (m: any) => m.user_id === user.id
    );

    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversation' },
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
    const { title } = body;

    const { data, error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', params.id)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'mark_read') {
      const { error } = await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', params.id)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Conversation marked as read' });
    }

    if (action === 'pin') {
      const { error } = await supabase
        .from('conversation_members')
        .update({ is_pinned: true })
        .eq('conversation_id', params.id)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Conversation pinned' });
    }

    if (action === 'unpin') {
      const { error } = await supabase
        .from('conversation_members')
        .update({ is_pinned: false })
        .eq('conversation_id', params.id)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Conversation unpinned' });
    }

    if (action === 'archive') {
      const { error } = await supabase
        .from('conversation_members')
        .update({ is_archived: true })
        .eq('conversation_id', params.id)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Conversation archived' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error performing action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
