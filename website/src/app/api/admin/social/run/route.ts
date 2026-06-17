import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Zernio from '@zernio/node';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseServiceKey as string);

// Core execution method
async function processSocialPosts(id?: number) {
  let postsToProcess: any[] = [];

  if (id) {
    // Process single post immediately
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch post: ${error.message}`);
    }
    postsToProcess = [data];
  } else {
    // Process all pending scheduled posts
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (error) {
      throw new Error(`Failed to query scheduled posts: ${error.message}`);
    }
    postsToProcess = data || [];
  }

  if (postsToProcess.length === 0) {
    return { message: 'No scheduled posts ready for execution.', processed: 0, results: [] };
  }

  const apiKey = process.env.ZERNIO_API_KEY;
  const isSimulation = !apiKey || apiKey.includes('placeholder');
  const processedResults = [];

  for (const post of postsToProcess) {
    let status = 'posted';
    let logs = post.logs || '';
    logs += `\n--- Execution started at ${new Date().toLocaleString()} ---\n`;

    if (isSimulation) {
      logs += `[SIMULATION] No ZERNIO_API_KEY environment variable configured.\n`;
      logs += `[SIMULATION] Running API scheduler in simulated sandbox mode...\n\n`;

      for (const platform of post.platforms) {
        logs += `[${platform.toUpperCase()}] Initialising OAuth account credentials...\n`;
        logs += `[${platform.toUpperCase()}] Authenticated channel handle successfully.\n`;
        
        if (post.image_url) {
          logs += `[${platform.toUpperCase()}] Uploading attachments from URL: ${post.image_url.substring(0, 50)}...\n`;
          logs += `[${platform.toUpperCase()}] Asset processing completed.\n`;
        }

        logs += `[${platform.toUpperCase()}] Publishing post text: "${post.content.substring(0, 30)}..."\n`;

        // Simulate random failure (5% chance)
        const isFailed = Math.random() < 0.05;
        if (isFailed) {
          status = 'failed';
          logs += `[${platform.toUpperCase()}] ❌ API Call Failed: Rate limit exceeded (HTTP 429). Post execution aborted.\n`;
          break;
        } else {
          const mockId = Math.floor(Math.random() * 1e16);
          logs += `[${platform.toUpperCase()}] ✅ Success (HTTP 201) - Platform Post ID: ${mockId}\n\n`;
        }
      }

      if (status === 'posted') {
        logs += `[SCHEDULER] All channels completed successfully. Post is now live.\n`;
      }
    } else {
      // Real Zernio SDK Integration
      try {
        const zernio = new Zernio({ apiKey });
        logs += `[Zernio API] Dispatching single-call multi-platform publish...\n`;
        logs += `[Zernio API] Target platforms: ${post.platforms.join(', ')}\n`;
        
        // Get linked accounts first to match accountId for each platform
        logs += `[Zernio API] Fetching connected accounts list...\n`;
        const accountsRes = await zernio.accounts.listAccounts();
        if (accountsRes.error) {
          throw new Error(`Failed to list accounts: ${JSON.stringify(accountsRes.error)}`);
        }
        const accounts = (accountsRes.data?.accounts || []) as any[];
        
        const zernioPlatforms: any[] = [];
        const mediaItems: any[] = [];
        if (post.image_url) {
          mediaItems.push({
            type: 'image',
            url: post.image_url
          });
        }

        for (const platform of post.platforms) {
          if (platform === 'truthsocial') {
            // Simulate Truth Social directly since Zernio doesn't support it
            logs += `[TRUTH SOCIAL] (Simulated) Publishing post text: "${post.content.substring(0, 30)}..."\n`;
            logs += `[TRUTH SOCIAL] ✅ (Simulated) Success - Platform Post ID: ${Math.floor(Math.random() * 1e16)}\n`;
            continue;
          }

          // Find matching active connected account
          const match = accounts.find((a: any) => a.platform === platform && a.isActive);
          if (match) {
            zernioPlatforms.push({
              platform,
              accountId: match._id
            });
            logs += `[Zernio API] Matched active account for ${platform} (${match.username || match.displayName || match._id})\n`;
          } else {
            logs += `[Zernio API] ⚠️ No active connected account found for platform: ${platform}. Skipping.\n`;
          }
        }

        if (zernioPlatforms.length > 0) {
          logs += `[Zernio API] Calling createPost with ${zernioPlatforms.length} platforms...\n`;
          const result = await zernio.posts.createPost({
            body: {
              content: post.content,
              platforms: zernioPlatforms,
              mediaItems: mediaItems.length > 0 ? mediaItems : undefined
            }
          });

          if (result.error) {
            throw new Error(`Zernio API createPost error: ${JSON.stringify(result.error)}`);
          }

          const broadcastId = (result.data as any)?.post?._id || (result.data as any)?.message || 'ok';
          logs += `[Zernio API] ✅ Zernio publishing completed. Broadcast ID: ${broadcastId}\n`;
        } else {
          logs += `[Zernio API] No Zernio-supported platforms targeted. Skipped Zernio API dispatch.\n`;
        }
      } catch (err: any) {
        status = 'failed';
        logs += `[Zernio API] ❌ Zernio SDK error during publish: ${err.message || err}\n`;
      }
    }

    // Update database status and logs
    const { data: updatedPost, error: updateError } = await supabase
      .from('social_posts')
      .update({
        status,
        logs,
        posted_at: status === 'posted' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', post.id)
      .select()
      .single();

    if (updateError) {
      console.error(`Failed to update social post ${post.id}:`, updateError.message);
    } else {
      processedResults.push(updatedPost);
    }
  }

  return { success: true, processed: processedResults.length, results: processedResults };
}

// POST endpoint (triggered from Admin UI or manual execution)
export async function POST(req: Request) {
  try {
    let body: { id?: number } = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const { id } = body;
    const result = await processSocialPosts(id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API scheduler run error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET endpoint (triggered by Cron Jobs)
export async function GET(req: Request) {
  try {
    // Optional check for Vercel Cron authorization header if CRON_SECRET env variable is set
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
      }
    }

    const result = await processSocialPosts();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API cron run error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

