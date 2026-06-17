"use client";

import { useEffect } from "react";
import { fetchJobs, fetchJobById, fetchCategories, fetchNews } from "@/lib/api";

export default function WebMCPInitializer() {
  useEffect(() => {
    // Resilient detection of the experimental WebMCP modelContext API across different browser releases
    const modelContext =
      (navigator as any).modelContext ||
      (window as any).modelContext ||
      (document as any).modelContext;

    if (!modelContext || typeof modelContext.registerTool !== "function") {
      console.log("[WebMCP] ℹ️ WebMCP is not supported/enabled in this browser version. Skipping tool registration.");
      return;
    }

    try {
      console.log("[WebMCP] 🚀 WebMCP detected! Registering job portal capabilities for AI agents...");

      // 1. Tool: Search Jobs
      modelContext.registerTool(
        {
          name: "search_jobs",
          description: "Search and filter active job listings on FutureTalent.",
          inputSchema: {
            type: "object",
            properties: {
              search: {
                type: "string",
                description: "Search keyword matching job title, company, or description."
              },
              category: {
                type: "string",
                description: "Filter jobs by specific category name (e.g. 'Frontend Development', 'Cloud & DevOps')."
              },
              remote_type: {
                type: "string",
                enum: ["worldwide", "country"],
                description: "Filter by worldwide remote status or country-specific remote status."
              },
              limit: {
                type: "number",
                default: 10,
                description: "Maximum number of jobs to return."
              },
              offset: {
                type: "number",
                default: 0,
                description: "Number of jobs to skip for pagination."
              }
            }
          }
        },
        async (params: any) => {
          try {
            const data = await fetchJobs({
              search: params.search,
              category: params.category,
              remote_type: params.remote_type,
              limit: params.limit,
              offset: params.offset
            });
            return {
              success: true,
              jobs: data.jobs.map(j => ({
                id: j.id,
                title: j.title,
                company: j.company,
                location: j.location,
                remote_type: j.remote_type,
                workplace_type: j.workplace_type,
                category: j.category,
                salary: j.salary,
                posted_at: j.posted_at,
                tags: j.tags
              })),
              count: data.count,
              limit: data.limit,
              offset: data.offset
            };
          } catch (err: any) {
            return { success: false, error: err.message || String(err) };
          }
        }
      );

      // 2. Tool: Get Job Details
      modelContext.registerTool(
        {
          name: "get_job_details",
          description: "Retrieve full details (including the full markdown description) of a specific job listing.",
          inputSchema: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "The unique job ID (e.g., '1023' or '1023-senior-frontend-developer')."
              }
            },
            required: ["id"]
          }
        },
        async (params: any) => {
          try {
            // Support extracting ID if it is a hyphenated slug (e.g. "1023-senior-frontend-developer")
            const idPart = params.id.split("-")[0];
            const job = await fetchJobById(idPart);
            return {
              success: true,
              job: {
                id: job.id,
                title: job.title,
                company: job.company,
                company_logo: job.company_logo,
                location: job.location,
                description: job.description,
                remote_type: job.remote_type,
                workplace_type: job.workplace_type,
                category: job.category,
                salary: job.salary,
                posted_at: job.posted_at,
                url: job.url,
                tags: job.tags
              }
            };
          } catch (err: any) {
            return { success: false, error: err.message || String(err) };
          }
        }
      );

      // 3. Tool: Get Categories
      modelContext.registerTool(
        {
          name: "get_categories",
          description: "Get the list of job categories and active job counts in each.",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        async () => {
          try {
            const categories = await fetchCategories();
            return { success: true, categories };
          } catch (err: any) {
            return { success: false, error: err.message || String(err) };
          }
        }
      );

      // 4. Tool: Get Blog Posts
      modelContext.registerTool(
        {
          name: "get_blog_posts",
          description: "Get recent remote work, career guidance, and tech articles from the blog.",
          inputSchema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                default: 10,
                description: "Maximum number of articles to return."
              },
              offset: {
                type: "number",
                default: 0,
                description: "Number of articles to skip."
              }
            }
          }
        },
        async (params: any) => {
          try {
            const data = await fetchNews(params.limit, params.offset);
            return {
              success: true,
              articles: data.news.map(n => ({
                title: n.title,
                slug: n.slug,
                excerpt: n.excerpt,
                category: n.category,
                author: n.author,
                published_at: n.published_at
              })),
              count: data.count
            };
          } catch (err: any) {
            return { success: false, error: err.message || String(err) };
          }
        }
      );

      console.log("[WebMCP] ✅ All AI Agent WebMCP tools registered successfully!");
    } catch (err) {
      console.error("[WebMCP] ❌ Error registering WebMCP tools:", err);
    }
  }, []);

  return null; // This component registers the tools and renders no visual content
}
