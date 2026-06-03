import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseServiceKey as string);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('system_stats_view')
      .select('*')
      .single();

    if (error) {
      console.error('Supabase query error on system_stats_view:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API stats error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
