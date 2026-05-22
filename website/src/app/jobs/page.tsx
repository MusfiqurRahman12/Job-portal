"use client";

import { useEffect, useState, Suspense } from "react";
import { fetchJobs, fetchCategories, getHoursLeft, Job, CategoryCount } from "@/lib/api";
import { useSearchParams, useRouter } from "next/navigation";

function ExpireBadge({ hoursLeft }: { hoursLeft: number }) {
  let cls = "expire-badge fresh";
  let label = `${hoursLeft}h left`;
  if (hoursLeft <= 4) {
    cls = "expire-badge urgent";
    label = `⚠ ${hoursLeft}h left`;
  } else if (hoursLeft <= 12) {
    cls = "expire-badge expiring";
  }
  return <span className={cls}>{label}</span>;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Engineering": "#8b5cf6",
  "Design": "#ec4899",
  "Marketing": "#f59e0b",
  "Product": "#22d3ee",
  "Data Science": "#34d399",
  "DevOps": "#f97316",
  "General": "#94a3b8"
};

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialCategory = searchParams.get("category") || "All";
  const initialSearch = searchParams.get("search") || "";
  
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory !== "All") params.set("category", activeCategory);
    if (searchQuery) params.set("search", searchQuery);
    router.replace(`/jobs?${params.toString()}`);
  }, [activeCategory, searchQuery, router]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const jobsParams = {
          limit: 50,
          category: activeCategory === "All" ? undefined : activeCategory,
          search: searchQuery || undefined,
        };
        const [jobsRes, cats] = await Promise.all([
          fetchJobs(jobsParams),
          fetchCategories()
        ]);
        
        setJobs(jobsRes.jobs || []);
        setCategories(cats || []);
      } catch (err) {
        console.error("Failed to load jobs", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeCategory, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  return (
    <>
      <nav className="navbar scrolled">
        <div className="navbar-inner">
          <a href="/" className="nav-logo">Remote<span>Hub</span></a>
          <div className="nav-links">
            <a href="/jobs" className="nav-link active">Browse Jobs</a>
            <a href="/#categories" className="nav-link">Categories</a>
            <a href="/blog" className="nav-link">Blog</a>
            <a href="#" className="nav-cta">Post a Job</a>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
          
          {/* LEFT SIDEBAR */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-28 glass-card p-6">
              <h3 className="text-lg font-bold mb-4 gradient-text">Categories</h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => setActiveCategory("All")}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium flex justify-between items-center ${activeCategory === "All" ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa]' : 'text-[#94a3b8] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'}`}
                  >
                    All Categories
                  </button>
                </li>
                {categories.map(cat => (
                  <li key={cat.name}>
                    <button 
                      onClick={() => setActiveCategory(cat.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium flex justify-between items-center ${activeCategory === cat.name ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa]' : 'text-[#94a3b8] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'}`}
                    >
                      <span className="truncate mr-2">{cat.name}</span>
                      <span className="bg-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded text-xs">{cat.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1">
            <div className="mb-8">
              <h1 className="text-4xl font-extrabold mb-4 tracking-tight">
                Browse <span className="gradient-text">{activeCategory === "All" ? "All Jobs" : activeCategory}</span>
              </h1>
              
              <form onSubmit={handleSearch} className="search-container !relative !max-w-full !transform-none !opacity-100">
                <input
                  type="text"
                  className="search-bar"
                  placeholder="Search role, position, skills, experience..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button type="submit" className="search-btn">Search</button>
              </form>
            </div>

            {loading ? (
              <div className="text-center py-20 text-[#94a3b8]">
                <div className="inline-block w-8 h-8 border-2 border-[rgba(139,92,246,0.2)] border-t-[#8b5cf6] rounded-full animate-spin mb-4"></div>
                <p>Loading jobs...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="glass-card text-center py-20">
                <p className="text-xl font-medium text-white mb-2">No jobs found</p>
                <p className="text-[#94a3b8]">Try adjusting your search filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-[#94a3b8] mb-4">Showing {jobs.length} jobs</div>
                {jobs.map((job) => {
                  const hoursLeft = job.expires_at ? getHoursLeft(job.expires_at) : 24;
                  const color = CATEGORY_COLORS[job.category] || CATEGORY_COLORS["General"];
                  const company_logo = job.company_logo || job.company[0];
                  
                  return (
                    <div
                      key={job.id}
                      className="glass-card job-card flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="company-avatar"
                          style={{
                            background: `linear-gradient(135deg, ${color}20, ${color}40)`,
                            border: `1px solid ${color}50`,
                            color: color,
                          }}
                        >
                          {company_logo.length > 1 && company_logo.startsWith("http") ? (
                            <img src={company_logo} alt={job.company} className="w-full h-full object-contain rounded-md p-1" />
                          ) : (
                            company_logo
                          )}
                        </div>
                        <div>
                          <h3 className="text-[1.05rem] font-bold text-white mb-1">{job.title}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#94a3b8]">
                            <span className="font-medium">{job.company}</span>
                            <span className="text-[#334155]">•</span>
                            <span className="inline-flex items-center gap-1">
                              {job.remote_type === "worldwide" ? "🌍" : "📍"} {job.location}
                            </span>
                          </div>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {job.tags?.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="text-[0.7rem] font-medium px-2.5 py-0.5 rounded-full"
                                style={{
                                  background: `${color}10`,
                                  color: color,
                                  border: `1px solid ${color}20`,
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 md:ml-auto">
                        <div className="text-right hidden md:block">
                          <div className="font-bold text-white text-sm">{job.salary || "Competitive"}</div>
                          <div className="text-xs text-[#64748b] mt-0.5">{job.category}</div>
                        </div>
                        <ExpireBadge hoursLeft={hoursLeft} />
                        <a href={`/jobs/${job.id}`}
                          className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 inline-block text-center"
                          style={{
                            background: `${color}15`,
                            color: color,
                            border: `1px solid ${color}30`,
                          }}
                        >
                          View Job →
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="border-t border-[rgba(255,255,255,0.06)] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[#64748b] text-sm">
            <span>© 2026 RemoteHub. All rights reserved.</span>
            <span>Powered by AI • Built with ♥ for remote workers</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="pt-32 text-center text-white">Loading...</div>}>
      <JobsContent />
    </Suspense>
  );
}
