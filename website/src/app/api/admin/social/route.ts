import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseServiceKey as string);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase query error on social_posts:', error.message);
      return NextResponse.json({ posts: [] });
    }

    return NextResponse.json({ posts: data || [] });
  } catch (err: any) {
    console.error('API GET social posts error:', err);
    return NextResponse.json({ posts: [] });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const post = {
      content: data.content,
      image_url: data.image_url || '',
      platforms: data.platforms || [],
      scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString() : new Date().toISOString(),
      status: data.status || 'scheduled',
      logs: `Post created at ${new Date().toLocaleString()}\n`
    };

    const { data: inserted, error } = await supabase
      .from('social_posts')
      .insert([post])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error on social_posts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: inserted });
  } catch (err: any) {
    console.error('API POST social post error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const { id, ...updates } = data;

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('social_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error on social_posts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: updated });
  } catch (err: any) {
    console.error('API PUT social post error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('social_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error on social_posts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API DELETE social post error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
