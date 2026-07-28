import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    const { userId, role = 'member' } = body;

    // Verify user is admin
    const { data: member } = await supabase
      .from('conversation_members')
      .select('role')
      .eq('conversation_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (!member || member.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('conversation_members')
      .insert({
        conversation_id: params.id,
        user_id: userId,
        role
      });

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Member added' }, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add member' },
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Verify user is admin or removing themselves
    const { data: member } = await supabase
      .from('conversation_members')
      .select('role')
      .eq('conversation_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (!member || (member.role !== 'admin' && userId !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', params.id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
