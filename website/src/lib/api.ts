const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface Job {
  id: string;
  title: string;
  company: string;
  company_logo: string;
  location: string;
  description: string;
  source: string;
  url: string;
  remote_type: "worldwide" | "country" | "hybrid";
  category: string;
  tags: string[];
  salary: string;
  posted_at: string;
  expires_at: string;
  created_at: string;
  is_active: boolean;
}

export interface JobsResponse {
  jobs: Job[];
  count: number;
  limit: number;
  offset: number;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export async function fetchJobs(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  remote_type?: string;
  search?: string;
}): Promise<JobsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  if (params?.category) searchParams.set("category", params.category);
  if (params?.remote_type) searchParams.set("remote_type", params.remote_type);
  if (params?.search) searchParams.set("search", params.search);

  const res = await fetch(`${API_URL}/api/jobs?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function fetchJobCount(): Promise<number> {
  const res = await fetch(`${API_URL}/api/jobs/count`);
  if (!res.ok) throw new Error("Failed to fetch job count");
  const data = await res.json();
  return data.count;
}

export async function fetchCategories(): Promise<CategoryCount[]> {
  const res = await fetch(`${API_URL}/api/jobs/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

// Helper: Calculate hours remaining before a job expires
export function getHoursLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
}

export async function fetchJobById(id: string): Promise<Job> {
  const res = await fetch(`${API_URL}/api/jobs/${id}`);
  if (!res.ok) throw new Error("Failed to fetch job");
  return res.json();
}

export interface News {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  author: string;
  url: string;
  published_at: string;
  created_at: string;
}

export interface NewsResponse {
  news: News[];
  count: number;
  limit: number;
  offset: number;
}

export async function fetchNews(limit = 10, offset = 0): Promise<NewsResponse> {
  const res = await fetch(`${API_URL}/api/news?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error("Failed to fetch news articles");
  return res.json();
}

export async function fetchNewsBySlug(slug: string): Promise<News> {
  const res = await fetch(`${API_URL}/api/news/${slug}`);
  if (!res.ok) throw new Error(`Failed to fetch news article: ${slug}`);
  return res.json();
}

