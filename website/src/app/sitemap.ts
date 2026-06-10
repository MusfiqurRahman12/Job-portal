import { MetadataRoute } from "next";
import { fetchJobs, fetchNews, slugify, fetchCompanyProfiles } from "@/lib/api";

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use public URL if available, fallback to default production URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.futuretalent.online";

  let jobUrls: MetadataRoute.Sitemap = [];
  try {
    // Fetch up to 1000 active non-expired jobs
    const jobsRes = await fetchJobs({ limit: 1000 });
    const jobs = jobsRes.jobs || [];
    jobUrls = jobs.map((job) => ({
      url: `${baseUrl}/jobs/${job.id}-${slugify(job.title + " " + job.company)}`,
      lastModified: new Date(job.created_at || job.posted_at),
      changeFrequency: "daily",
      priority: 0.8,
    }));
  } catch (err) {
    console.error("Failed to generate sitemap URLs for jobs:", err);
  }

  let newsUrls: MetadataRoute.Sitemap = [];
  try {
    // Fetch up to 100 news articles
    const newsRes = await fetchNews(100);
    const news = newsRes.news || [];
    newsUrls = news.map((article) => ({
      url: `${baseUrl}/blog/${article.slug}`,
      lastModified: new Date(article.published_at || article.created_at),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (err) {
    console.error("Failed to generate sitemap URLs for news:", err);
  }

  let companyUrls: MetadataRoute.Sitemap = [];
  try {
    const companies = await fetchCompanyProfiles();
    companyUrls = companies.map((company) => ({
      url: `${baseUrl}/companies/${slugify(company.name)}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    }));
  } catch (err) {
    console.error("Failed to generate sitemap URLs for companies:", err);
  }

  return [
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
    {
      url: `${baseUrl}/companies`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...jobUrls,
    ...newsUrls,
    ...companyUrls,
  ];
}
