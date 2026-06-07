import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GITHUB_REPO = 'MusfiqurRahman12/Job-portal';
const WORKFLOW_ID = 'scrape.yml'; // Use the filename of the workflow

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey as string);

export async function GET() {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_PAT not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/runs?per_page=10`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `GitHub API error: ${res.statusText}`, details: errorText }, { status: res.status });
    }

    const data = await res.json();
    const githubRuns = data.workflow_runs || [];

    // Fetch database scraper runs
    const { data: dbRuns, error: dbError } = await supabase
      .from('scraper_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(30);

    if (dbError) {
      console.error('Supabase fetch error for scraper_runs:', dbError);
    }

    const dbRunsMap = new Map();
    if (dbRuns) {
      dbRuns.forEach((run) => {
        dbRunsMap.set(run.run_id, run);
      });
    }

    const mergedRuns = githubRuns.map((run: any) => {
      const dbRun = dbRunsMap.get(run.id.toString());
      return {
        ...run,
        jobs_added: dbRun ? dbRun.jobs_added : 0,
        articles_added: dbRun ? dbRun.articles_added : 0,
        db_status: dbRun ? dbRun.status : 'unknown',
        completed_at: dbRun ? dbRun.completed_at : null,
      };
    });

    return NextResponse.json({ runs: mergedRuns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


export async function POST() {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_PAT not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main', // The branch to run the workflow on
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `GitHub API error: ${res.statusText}`, details: errorText }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
