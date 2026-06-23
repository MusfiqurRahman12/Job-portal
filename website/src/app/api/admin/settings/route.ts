import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/admin/settings — Fetch all scraper settings as key-value pairs
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('scraper_settings')
      .select('key, value, description, updated_at');

    if (error) {
      console.error('Error fetching scraper_settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform array of rows into a settings object for easier frontend consumption
    const settings: Record<string, { value: string; description: string; updated_at: string }> = {};
    for (const row of data || []) {
      settings[row.key] = {
        value: row.value,
        description: row.description || '',
        updated_at: row.updated_at || '',
      };
    }

    return NextResponse.json({ settings }, {
      headers: {
        'Cache-Control': 'private, max-age=60', // Cache for 60s to avoid hammering DB
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/settings — Update one or more scraper settings
// Body: { settings: { "key": "value", ... } }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updates = body.settings as Record<string, string>;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Missing "settings" object in request body' }, { status: 400 });
    }

    const errors: string[] = [];
    const allowedKeys = ['enable_job_scraping', 'enable_article_scraping', 'article_author', 'article_seo_format'];

    for (const [key, value] of Object.entries(updates)) {
      // Validate key to prevent injection of arbitrary settings
      if (!allowedKeys.includes(key)) {
        errors.push(`Unknown setting key: ${key}`);
        continue;
      }

      const { error } = await supabase
        .from('scraper_settings')
        .upsert(
          { key, value: String(value), updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (error) {
        errors.push(`Failed to update "${key}": ${error.message}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 207 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
