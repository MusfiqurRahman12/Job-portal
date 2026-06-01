import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the Service Role Key for admin overrides
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey as string);

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Create URL-friendly slug
    const titleSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const companySlug = data.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${titleSlug}-at-${companySlug}-${Math.floor(Math.random() * 1000)}`;

    const job = {
      title: data.title,
      company: data.company,
      location: data.location,
      url: data.url,
      salary: data.salary || '',
      description: data.description,
      category: data.category || 'Other',
      type: data.type || 'Full-time',
      slug: slug,
      logo: data.logo || '',
      source: 'manual',
      created_at: new Date().toISOString(),
      posted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      is_active: true,
      tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()) : []
    };

    const { error } = await supabase.from('jobs').insert([job]);

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, slug });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
