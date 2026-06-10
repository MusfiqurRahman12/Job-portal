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

export interface CategoryStyle {
  icon: string;
  color: string;
}

export function getCategoryStyle(name: string): CategoryStyle {
  const PREDEFINED: Record<string, CategoryStyle> = {
    "Frontend Development": { icon: "🎨", color: "#ec4899" },
    "Backend Development": { icon: "⚙️", color: "#8b5cf6" },
    "Fullstack Development": { icon: "⚡", color: "#f59e0b" },
    "Cloud & DevOps": { icon: "☁️", color: "#22d3ee" },
    "Cybersecurity": { icon: "🛡️", color: "#dc2626" },
    "AI & Machine Learning": { icon: "🤖", color: "#6366f1" },
    "Web3 & Blockchain": { icon: "🪙", color: "#fbbf24" },
    "Mobile Development": { icon: "📱", color: "#10b981" },
    "Data Science & Analytics": { icon: "🧠", color: "#34d399" },
    "Data Engineering": { icon: "💾", color: "#06b6d4" },
    "QA & Testing": { icon: "✅", color: "#f97316" },
    "Product Management": { icon: "🚀", color: "#eab308" },
    "Design & Creative": { icon: "🎨", color: "#ec4899" },
    "Marketing & Sales": { icon: "📢", color: "#f59e0b" },
    "Customer Support": { icon: "🎧", color: "#22d3ee" },
    "Writing & Content": { icon: "✍️", color: "#8b5cf6" },
    "HR & Operations": { icon: "👥", color: "#34d399" },
    "General": { icon: "💼", color: "#94a3b8" }
  };

  if (PREDEFINED[name]) {
    return PREDEFINED[name];
  }

  // Fallback icon matching keywords
  let icon = "💼";
  const lowerName = name.toLowerCase();
  if (lowerName.includes("front") || lowerName.includes("ui")) icon = "🎨";
  else if (lowerName.includes("back") || lowerName.includes("engine")) icon = "⚙️";
  else if (lowerName.includes("full")) icon = "⚡";
  else if (lowerName.includes("devops") || lowerName.includes("cloud") || lowerName.includes("infra")) icon = "☁️";
  else if (lowerName.includes("security") || lowerName.includes("cyber")) icon = "🛡️";
  else if (lowerName.includes("ai ") || lowerName.includes("machine") || lowerName.includes("learn") || lowerName.includes("robot")) icon = "🤖";
  else if (lowerName.includes("crypto") || lowerName.includes("block") || lowerName.includes("web3")) icon = "🪙";
  else if (lowerName.includes("mobile") || lowerName.includes("ios") || lowerName.includes("android")) icon = "📱";
  else if (lowerName.includes("data") || lowerName.includes("scientist") || lowerName.includes("science")) icon = "🧠";
  else if (lowerName.includes("test") || lowerName.includes("qa") || lowerName.includes("quality")) icon = "✅";
  else if (lowerName.includes("product") || lowerName.includes("project")) icon = "🚀";
  else if (lowerName.includes("design") || lowerName.includes("creative")) icon = "🎨";
  else if (lowerName.includes("market") || lowerName.includes("sale") || lowerName.includes("growth")) icon = "📢";
  else if (lowerName.includes("support") || lowerName.includes("help") || lowerName.includes("custom")) icon = "🎧";
  else if (lowerName.includes("writ") || lowerName.includes("content")) icon = "✍️";
  else if (lowerName.includes("hr") || lowerName.includes("people") || lowerName.includes("recruit") || lowerName.includes("oper")) icon = "👥";

  // Dynamic Hex color generation based on HSL hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const s = 0.75; // 75%
  const l = 0.60; // 60%
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= hue && hue < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= hue && hue < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= hue && hue < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= hue && hue < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= hue && hue < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= hue && hue < 360) {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return {
    icon,
    color: `#${rHex}${gHex}${bHex}`
  };
}

export interface CompanyProfile {
  name: string;
  logo: string;
  open_jobs_count: number;
}

export async function fetchCompanyProfiles(): Promise<CompanyProfile[]> {
  const { data, error } = await supabase
    .from("company_profiles")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching company profiles from Supabase:", error);
    return [];
  }

  return (data as CompanyProfile[]) || [];
}

export async function fetchJobsByCompany(companyName: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("company", companyName)
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .order("posted_at", { ascending: false });

  if (error) {
    console.error(`Error fetching jobs for company ${companyName}:`, error);
    return [];
  }

  return (data as Job[]) || [];
}

export async function fetchCompanyBySlug(slug: string): Promise<CompanyProfile | null> {
  const profiles = await fetchCompanyProfiles();
  const profile = profiles.find((p) => slugify(p.name) === slug);
  return profile || null;
}


