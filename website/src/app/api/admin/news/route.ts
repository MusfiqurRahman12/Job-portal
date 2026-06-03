import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the Service Role Key for admin overrides
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseServiceKey as string);

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Create URL-friendly slug
    const titleSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${titleSlug}-${Math.floor(Math.random() * 1000)}`;

    const article = {
      title: data.title,
      slug: slug,
      excerpt: data.excerpt,
      content: data.content,
      category: data.category || 'Tech',
      image: data.image || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
      author: data.author || 'Admin',
      url: data.url || `https://www.futuretalent.online/blog/${slug}`,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('news').insert([article]);

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
