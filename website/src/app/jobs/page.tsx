import { Suspense } from "react";
import { fetchJobs, fetchCategories, getHoursLeft, Job, slugify, getCategoryStyle } from "@/lib/api";
import Link from "next/link";
import SearchForm from "@/components/SearchForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse All Jobs — Remote, Hybrid & On-Site | FutureTalent",
  description: "Browse hundreds of active remote, hybrid, and on-site jobs in Software Engineering, Design, Marketing, Product Management, and DevOps. Filter by category, location, and skills.",
  alternates: {
    canonical: "https://www.futuretalent.online/jobs",
  },
};

function ExpireBadge({ hoursLeft }: { hoursLeft: number }) {
  let cls = "expire-badge fresh";
  let label = "";
  if (hoursLeft <= 24) {
    label = `${hoursLeft}h left`;
    if (hoursLeft <= 4) {
      cls = "expire-badge urgent";
      label = `⚠ ${hoursLeft}h left`;
    } else if (hoursLeft <= 12) {
      cls = "expire-badge expiring";
    }
  } else {
    const days = Math.floor(hoursLeft / 24);
    const hours = hoursLeft % 24;
    if (hours === 0) {
      label = `${days}d left`;
    } else {
      label = `${days}d ${hours}h left`;
    }
  }
  return <span className={cls}>{label}</span>;
}

const WORKPLACE_BADGES: Record<string, { label: string; icon: string; color: string }> = {
  remote: { label: "Remote", icon: "🏠", color: "#34d399" },
  hybrid: { label: "Hybrid", icon: "🔄", color: "#f59e0b" },
  onsite: { label: "On-Site", icon: "🏢", color: "#6366f1" },
};

interface PageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    page?: string;
  }>;
}

// Wrapper content component to resolve parameters and fetch data on the server
async function JobsContent({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const activeCategory = resolvedParams.category || "All";
  const searchQuery = resolvedParams.search || "";
  const currentPage = parseInt(resolvedParams.page || "1", 10);
  
  const PAGE_SIZE = 10;

  const jobsParams = {
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
    category: activeCategory === "All" ? undefined : activeCategory,
    search: searchQuery || undefined,
  };

  // Concurrent server-side fetches
  const [jobsRes, categories] = await Promise.all([
    fetchJobs(jobsParams),
    fetchCategories()
  ]);

  const jobs = jobsRes.jobs || [];
  const totalCount = jobsRes.count || 0;

  // Helper to generate dynamic search parameter URL strings for categories
  const getCategoryUrl = (catName: string) => {
    const params = new URLSearchParams();
    if (catName !== "All") params.set("category", catName);
    if (searchQuery) params.set("search", searchQuery);
    return `/jobs?${params.toString()}`;
  };

  // Helper to generate dynamic search parameter URL strings for pagination
  const getPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (activeCategory !== "All") params.set("category", activeCategory);
    if (searchQuery) params.set("search", searchQuery);
    if (pageNumber > 1) params.set("page", String(pageNumber));
    return `/jobs?${params.toString()}`;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };


  return (
    <>
      <nav className="navbar scrolled">
        <div className="navbar-inner">
          <a href="/" className="nav-logo">Future<span>Talent</span></a>
          <div className="nav-links">
            <a href="/jobs" className="nav-link active">Browse Jobs</a>
            <a href="/#categories" className="nav-link">Categories</a>
            <a href="/blog" className="nav-link">Blog</a>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-20 md:pt-28 pb-10 md:pb-16 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 lg:gap-8 min-h-[calc(100vh-12rem)]">
          
          {/* Mobile Page Title */}
          <div className="lg:hidden w-full">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Browse <span className="gradient-text">{activeCategory === "All" ? "All Jobs" : activeCategory}</span>
            </h1>
          </div>
          
          {/* LEFT SIDEBAR */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-28 glass-card p-6">
              <h3 className="text-lg font-bold mb-4 gradient-text">Categories</h3>
              <ul className="space-y-2">
                <li>
                  <Link 
                    href={getCategoryUrl("All")}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium flex justify-between items-center ${activeCategory === "All" ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa]' : 'text-[#94a3b8] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'}`}
                  >
                    All Categories
                  </Link>
                </li>
                {categories.map(cat => (
                  <li key={cat.name}>
                    <Link 
                      href={getCategoryUrl(cat.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium flex justify-between items-center ${activeCategory === cat.name ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa]' : 'text-[#94a3b8] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'}`}
                    >
                      <span className="truncate mr-2">{cat.name}</span>
                      <span className="bg-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded text-xs">{cat.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1">
            <div className="mb-8">
              <h1 className="text-4xl font-extrabold mb-4 tracking-tight hidden lg:block">
                Browse <span className="gradient-text">{activeCategory === "All" ? "All Jobs" : activeCategory}</span>
              </h1>
              
              {/* Client Component Search Form */}
              <SearchForm />
            </div>

            {jobs.length === 0 ? (
              <div className="glass-card text-center py-20">
                <p className="text-xl font-medium text-white mb-2">No jobs found</p>
                <p className="text-[#94a3b8]">Try adjusting your search filters</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-sm text-[#94a3b8] mb-4">
                  Showing {Math.min(totalCount, (currentPage - 1) * PAGE_SIZE + 1)}–
                  {Math.min(totalCount, currentPage * PAGE_SIZE)} of {totalCount} jobs
                </div>
                
                <div className="space-y-4">
                  {jobs.map((job) => {
                    const hoursLeft = job.expires_at ? getHoursLeft(job.expires_at) : 24;
                    const color = getCategoryStyle(job.category).color || "#94a3b8";
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
                              {(() => {
                                const wpBadge = WORKPLACE_BADGES[job.workplace_type] || WORKPLACE_BADGES.remote;
                                return (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${wpBadge.color}15`, color: wpBadge.color, border: `1px solid ${wpBadge.color}30` }}>
                                    {wpBadge.icon} {wpBadge.label}
                                  </span>
                                );
                              })()}
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
                          <Link href={`/jobs/${job.id}-${slugify(job.title + " " + job.company)}`}
                            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 inline-block text-center"
                            style={{
                              background: `${color}15`,
                              color: color,
                              border: `1px solid ${color}30`,
                            }}
                          >
                            View Job →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PAGINATION CONTROLS */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5 mt-8">
                    {currentPage === 1 ? (
                      <span className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/10 opacity-40 select-none">
                        ← Previous
                      </span>
                    ) : (
                      <Link
                        href={getPageUrl(currentPage - 1)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-white/10 hover:bg-white/5"
                      >
                        ← Previous
                      </Link>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {getPageNumbers().map((page, idx) => {
                        if (page === "...") {
                          return (
                            <span key={`ellipsis-${idx}`} className="px-3 text-gray-500 font-bold select-none">
                              ...
                            </span>
                          );
                        }
                        const pNum = page as number;
                        return (
                          <Link
                            key={pNum}
                            href={getPageUrl(pNum)}
                            className={`w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
                              currentPage === pNum
                                ? "bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/30 border border-[#8b5cf6]"
                                : "border border-white/10 hover:bg-white/5 text-[#94a3b8]"
                            }`}
                          >
                            {pNum}
                          </Link>
                        );
                      })}
                    </div>

                    {currentPage === totalPages ? (
                      <span className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/10 opacity-40 select-none">
                        Next →
                      </span>
                    ) : (
                      <Link
                        href={getPageUrl(currentPage + 1)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-white/10 hover:bg-white/5"
                      >
                        Next →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
          <div className="border-t border-[rgba(255,255,255,0.06)] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[#64748b] text-sm">
            <span>© 2026 FutureTalent. All rights reserved. • <Link href="/privacy" className="hover:underline hover:text-white">Privacy Policy</Link></span>
            <span>Powered by AI • Built with ♥ for job seekers everywhere</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default function JobsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<div className="pt-32 text-center text-white">Loading...</div>}>
      <JobsContent searchParams={searchParams} />
    </Suspense>
  );
}
export const dynamic = "force-dynamic";
