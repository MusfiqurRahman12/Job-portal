import { MetadataRoute } from "next";
import { fetchJobs, fetchNews } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use public URL if available, fallback to default production URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://futuretalent.com";

  let jobUrls: MetadataRoute.Sitemap = [];
  try {
    // Fetch up to 100 active non-expired jobs
    const jobsRes = await fetchJobs({ limit: 100 });
    const jobs = jobsRes.jobs || [];
    jobUrls = jobs.map((job) => ({
      url: `${baseUrl}/jobs/${job.id}`,
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
    ...jobUrls,
    ...newsUrls,
  ];
}
