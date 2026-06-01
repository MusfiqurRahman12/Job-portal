import { NextResponse } from 'next/server';

const GITHUB_REPO = 'MusfiqurRahman12/Job-portal';
const WORKFLOW_ID = 'scrape.yml'; // Use the filename of the workflow

export async function GET() {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_PAT not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/runs?per_page=5`,
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
    return NextResponse.json({ runs: data.workflow_runs });
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
