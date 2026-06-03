import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseServiceKey as string);

export async function GET() {
  try {
    const res1 = await supabase
      .from('news')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(0, 19);

    const res2 = await supabase
      .from('news')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(20, 39);

    return NextResponse.json({
      page1_count: res1.data?.length,
      page1_total: res1.count,
      page2_count: res2.data?.length,
      page2_total: res2.count,
      error1: res1.error,
      error2: res2.error,
      page1_sample: res1.data?.slice(0, 3).map(d => ({ id: d.id, title: d.title, published_at: d.published_at })),
      page2_sample: res2.data?.slice(0, 3).map(d => ({ id: d.id, title: d.title, published_at: d.published_at }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
