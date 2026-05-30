import { fetchJobs } from "@/lib/api";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.futuretalent.online";
  let jobs: any[] = [];
  
  try {
    // Fetch up to 100 active non-expired jobs
    const res = await fetchJobs({ limit: 100 });
    jobs = res.jobs || [];
  } catch (err) {
    console.error("RSS Feed generation: failed to fetch jobs", err);
  }

  // Generate individual RSS item tags
  const rssItems = jobs
    .map((job) => {
      const jobUrl = `${baseUrl}/jobs/${job.id}`;
      return `
    <item>
      <title><![CDATA[${job.title} at ${job.company}]]></title>
      <link>${jobUrl}</link>
      <guid isPermaLink="true">${jobUrl}</guid>
      <pubDate>${new Date(job.posted_at || job.created_at).toUTCString()}</pubDate>
      <description><![CDATA[${job.description}]]></description>
      <category>${job.category}</category>
    </item>`;
    })
    .join("");

  // Construct complete RSS channel
  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>FutureTalent — Remote Jobs Feed</title>
  <link>${baseUrl}</link>
  <description>AI-curated remote jobs updated every 24 hours. Find your next remote career anywhere.</description>
  <language>en-us</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
  ${rssItems}
</channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
    },
  });
}
export const dynamic = "force-dynamic";
