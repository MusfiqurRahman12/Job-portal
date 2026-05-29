import { supabase } from "./supabaseClient";

export interface Job {
  id: string;
  title: string;
  company: string;
  company_logo: string;
  location: string;
  description: string;
  source: string;
  url: string;
  remote_type: "worldwide" | "country";
  workplace_type: "remote" | "hybrid" | "onsite";
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
  const limit = params?.limit || 10;
  const offset = params?.offset || 0;

  let query = supabase
    .from("jobs")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString());

  if (params?.category) {
    query = query.eq("category", params.category);
  }

  if (params?.remote_type) {
    query = query.eq("remote_type", params.remote_type);
  }

  if (params?.search) {
    query = query.or(`title.ilike.%${params.search}%,company.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  query = query
    .order("posted_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error("Error fetching jobs from Supabase:", error);
    throw new Error("Failed to fetch jobs");
  }

  return {
    jobs: (data as Job[]) || [],
    count: count || 0,
    limit,
    offset,
  };
}

export async function fetchJobCount(): Promise<number> {
  const { count, error } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString());

  if (error) {
    console.error("Error fetching job count from Supabase:", error);
    throw new Error("Failed to fetch job count");
  }
  return count || 0;
}

export async function fetchCategories(): Promise<CategoryCount[]> {
  const { data, error } = await supabase
    .from("category_counts")
    .select("*");

  if (error) {
    console.error("Error fetching categories from Supabase view:", error);
    return [];
  }
  return (data as CategoryCount[]) || [];
}

// Helper: Calculate hours remaining before a job expires
export function getHoursLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
}

export async function fetchJobById(id: string): Promise<Job> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching job ${id} from Supabase:`, error);
    throw new Error("Failed to fetch job");
  }
  return data as Job;
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
  const { data, count, error } = await supabase
    .from("news")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching news from Supabase:", error);
    throw new Error("Failed to fetch news articles");
  }

  return {
    news: (data as News[]) || [],
    count: count || 0,
    limit,
    offset,
  };
}

export async function fetchNewsBySlug(slug: string): Promise<News> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(`Error fetching news article ${slug} from Supabase:`, error);
    throw new Error(`Failed to fetch news article: ${slug}`);
  }
  return data as News;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")          // Replace spaces with -
    .replace(/&/g, "-and-")        // Replace & with 'and'
    .replace(/[^\w\-]+/g, "")      // Remove all non-word chars
    .replace(/\-\-+/g, "-")        // Replace multiple - with single -
    .replace(/^-+/, "")            // Trim - from start of text
    .replace(/-+$/, "");           // Trim - from end of text
}

