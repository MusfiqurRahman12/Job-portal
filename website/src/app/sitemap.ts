import { MetadataRoute } from "next";
import { fetchJobs, fetchNews, slugify, fetchCompanyProfiles } from "@/lib/api";

export const dynamic = 'force-dynamic';

/**
 * Fetches ALL active, non-expired jobs by paginating through Supabase.
 * Supabase PostgREST has a default max of 1000 rows per request,
 * so we loop in batches to ensure we capture every job.
 */
async function fetchAllJobsForSitemap() {
  const PAGE_SIZE = 1000;
  let offset = 0;
  let allJobs: any[] = [];
  let totalCount = 0;

  // First call to get total count
  const firstBatch = await fetchJobs({ limit: PAGE_SIZE, offset: 0 });
  allJobs = firstBatch.jobs || [];
  totalCount = firstBatch.count || 0;

  // Continue fetching remaining pages
  offset = PAGE_SIZE;
  while (offset < totalCount) {
    const batch = await fetchJobs({ limit: PAGE_SIZE, offset });
    const batchJobs = batch.jobs || [];
    if (batchJobs.length === 0) break; // Safety: stop if no more rows
    allJobs = allJobs.concat(batchJobs);
    offset += PAGE_SIZE;
  }

  return { jobs: allJobs, totalCount };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.futuretalent.online";

  // ── Fetch all dynamic data concurrently ──
  const [jobsResult, newsRes, companies] = await Promise.all([
    fetchAllJobsForSitemap().catch((err) => {
      console.error("Sitemap: Failed to fetch jobs:", err);
      return { jobs: [], totalCount: 0 };
    }),
    fetchNews(500).catch((err) => {
      console.error("Sitemap: Failed to fetch news:", err);
      return { news: [], count: 0, limit: 500, offset: 0 };
    }),
    fetchCompanyProfiles().catch((err) => {
      console.error("Sitemap: Failed to fetch companies:", err);
      return [];
    }),
  ]);

  const jobs = jobsResult.jobs;
  const news = newsRes.news || [];

  // ── Individual Job URLs ──
  const jobUrls: MetadataRoute.Sitemap = jobs.map((job: any) => ({
    url: `${baseUrl}/jobs/${job.id}-${slugify(job.title + " " + job.company)}`,
    lastModified: new Date(job.created_at || job.posted_at),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // ── Blog / News article URLs ──
  const newsUrls: MetadataRoute.Sitemap = news.map((article: any) => ({
    url: `${baseUrl}/blog/${article.slug}`,
    lastModified: new Date(article.published_at || article.created_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // ── Company Profile URLs ──
  const companyUrls: MetadataRoute.Sitemap = companies.map((company: any) => ({
    url: `${baseUrl}/companies/${slugify(company.name)}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // ── Assemble complete sitemap ──
  // NOTE: Pagination (/jobs?page=N) and category-filtered (/jobs?category=X) pages
  // are excluded because they have noindex robots directives.
  // Including noindex pages in the sitemap sends conflicting signals to Google.
  return [
    // Static pages
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/jobs`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/companies`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    // Dynamic pages
    ...jobUrls,
    ...newsUrls,
    ...companyUrls,
  ];
}
