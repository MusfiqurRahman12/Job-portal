import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Create a Supabase client with the Service Role Key for admin overrides
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseServiceKey as string);

// Google Indexing API integration
async function notifyGoogleIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED') {
  try {
    const credsStr = process.env.GOOGLE_INDEXING_CREDENTIALS;
    if (!credsStr) {
      console.warn('[Google Indexing] ⚠️ GOOGLE_INDEXING_CREDENTIALS not configured. Skipping index notification.');
      return;
    }

    const creds = JSON.parse(credsStr);
    const clientEmail = creds.client_email;
    const privateKey = creds.private_key;

    if (!clientEmail || !privateKey) {
      console.warn('[Google Indexing] ⚠️ Invalid Google Indexing credentials structure.');
      return;
    }

    // 1. Create JWT header and claim set
    const header = { alg: 'RS256', typ: 'JWT' };
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const claimSet = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      exp,
      iat
    };

    // 2. Base64 encode
    const base64UrlEncode = (str: string) =>
      Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
    const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

    // 3. Sign the input using RS256
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    const signature = signer.sign(privateKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${signatureInput}.${signature}`;

    // 4. Request Access Token from Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`Failed to obtain Google access token: ${errorText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 5. Send Notification to Google Indexing API
    const indexingRes = await fetch('https://indexing.googleapis.com/v1/urlNotifications:publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        url,
        type
      })
    });

    if (!indexingRes.ok) {
      const errorText = await indexingRes.text();
      throw new Error(`Google Indexing API error: ${errorText}`);
    }

    console.log(`[Google Indexing] 🚀 Successfully notified Google Indexing API (${type}) for: ${url}`);
  } catch (err: any) {
    console.error('[Google Indexing] ❌ Error notifying Google Indexing:', err.message || err);
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Create URL-friendly slug parts
    const titleSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const companySlug = data.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Collect tags, blending UI selected type as a searchable tag
    const typeTag = data.type ? [data.type] : [];
    const userTags = data.tags ? data.tags.split(',').map((t: string) => t.trim()) : [];
    const mergedTags = Array.from(new Set([...typeTag, ...userTags])).filter(Boolean);

    const job = {
      title: data.title,
      company: data.company,
      location: data.location,
      url: data.url,
      salary: data.salary || '',
      description: data.description,
      category: data.category || 'Other',
      company_logo: data.logo || '',
      source: 'manual',
      remote_type: 'worldwide',
      workplace_type: 'remote',
      created_at: new Date().toISOString(),
      posted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      is_active: true,
      tags: mergedTags
    };

    const { data: inserted, error } = await supabase
      .from('jobs')
      .insert([job])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const insertedId = inserted?.id || Math.floor(Math.random() * 10000);
    const slug = `${insertedId}-${titleSlug}-at-${companySlug}`;

    // Publish new job URL to Google Indexing API asynchronously (without blocking response)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.futuretalent.online';
    const jobUrl = `${baseUrl}/jobs/${slug}`;
    notifyGoogleIndexing(jobUrl, 'URL_UPDATED').catch(err => {
      console.error('[Google Indexing] Async notification error:', err);
    });

    return NextResponse.json({ success: true, slug });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

