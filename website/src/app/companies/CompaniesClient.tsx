"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CompanyProfile, slugify } from "@/lib/api";

// Dynamically import the WebGL globe with SSR disabled to prevent Node compiler errors
const CompanyGlobe = dynamic(() => import("@/components/CompanyGlobe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[650px] rounded-3xl bg-[#0d0d18] border border-[#1e1b4b]/50 flex items-center justify-center text-[#64748b] relative">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
        <span className="text-xs tracking-[0.2em] uppercase font-semibold text-violet-400">
          Initializing 3D Globe...
        </span>
        <span className="text-[10px] text-[#475569]">
          Mapping {"companies"} worldwide
        </span>
      </div>
    </div>
  ),
});

interface CompaniesClientProps {
  companies: CompanyProfile[];
}

export default function CompaniesClient({ companies }: CompaniesClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"jobs-desc" | "name-asc" | "name-desc">("jobs-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  const listRef = useRef<HTMLHeadingElement>(null);

  // Filter and sort companies based on search input and sorting criteria
  const filteredAndSortedCompanies = useMemo(() => {
    let result = companies.filter((company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result = [...result].sort((a, b) => {
      if (sortBy === "jobs-desc") {
        return b.open_jobs_count - a.open_jobs_count;
      }
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name-desc") {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });

    return result;
  }, [companies, searchTerm, sortBy]);

  // Reset page to 1 when search or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  // Force reload when navigating back to the page from browser cache (bfcache)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Paginated slice of the filtered/sorted dataset
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedCompanies.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAndSortedCompanies, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedCompanies.length / PAGE_SIZE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (listRef.current) {
      listRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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

  const handleSelectCompanyFromGlobe = (company: CompanyProfile) => {
    setSelectedCompany(company);
    // Automatically navigate to the company page after a brief delay so they see the focus transition
    setTimeout(() => {
      window.location.href = `/companies/${slugify(company.name)}`;
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#06060a] text-white selection:bg-[#34d399] selection:text-black">
      {/* ══════ Navbar ══════ */}
      <nav className="navbar scrolled">
        <div className="navbar-inner">
          <Link href="/" className="nav-logo">
            Future<span>Talent</span>
          </Link>
          <div className="nav-links">
            <Link href="/#categories" className="nav-link">Categories</Link>
            <Link href="/companies" className="nav-link active">Companies</Link>
            <Link href="/blog" className="nav-link">Blog</Link>
            <Link href="/jobs" className="nav-cta-neon">Browse Jobs</Link>
          </div>
        </div>
      </nav>

      {/* ══════ Hero Header ══════ */}
      <header className="relative pt-24 md:pt-32 pb-10 px-4 md:px-6 overflow-hidden">
        {/* Glowing backgrounds */}
        <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,rgba(99,102,241,0.06)_40%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-[20%] left-[-10%] w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(52,211,153,0.05)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(139,92,246,0.25)] bg-[rgba(139,92,246,0.06)] text-[#a78bfa] text-xs font-semibold uppercase tracking-wider mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
            Global Tech Hubs & Hiring Brands
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Hiring Without <span className="gradient-text">Borders</span>
          </h1>

          <p className="text-base md:text-lg text-[#94a3b8] max-w-2xl mx-auto leading-relaxed mb-8">
            Explore active job positions by brand location worldwide. Use the interactive 3D globe to locate companies, or filter listings below.
          </p>

          {/* Search bar inside header */}
          <div className="max-w-md mx-auto mb-10">
            <div className="relative">
              <input
                type="text"
                placeholder="Search companies by name..."
                className="w-full px-5 py-3.5 pl-12 rounded-2xl bg-[#0e0e1a]/90 border border-white/10 text-white placeholder-[#64748b] focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all shadow-lg text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b] text-lg">🔍</span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-violet-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ══════ Globe Section ══════ */}
      <section className="px-4 md:px-6 pb-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          <CompanyGlobe
            companies={filteredAndSortedCompanies}
            onSelectCompany={handleSelectCompanyFromGlobe}
            selectedCompany={selectedCompany}
          />
        </div>
      </section>

      {/* ══════ Companies Grid (SEO & Keyboard Fallback) ══════ */}
      <main className="flex-1 px-4 md:px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          
          {/* Dynamic Toolbar */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white scroll-mt-24" ref={listRef}>
                Hiring Companies ({filteredAndSortedCompanies.length})
              </h2>
              <p className="text-xs text-[#64748b] mt-1">
                {filteredAndSortedCompanies.length > 0 
                  ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(filteredAndSortedCompanies.length, currentPage * PAGE_SIZE)} of ${filteredAndSortedCompanies.length} companies`
                  : "No companies found"}
              </p>
            </div>
            
            <div className="flex items-center gap-3 self-start sm:self-auto">
              {/* Sort Selector */}
              <div className="relative flex items-center gap-2">
                <span className="text-xs font-medium text-[#64748b] hidden md:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#0e0e1a]/95 border border-white/10 text-xs text-white focus:border-violet-500 focus:outline-none transition-all cursor-pointer hover:bg-white/5"
                >
                  <option value="jobs-desc">Jobs (Highest first)</option>
                  <option value="name-asc">Name (A - Z)</option>
                  <option value="name-desc">Name (Z - A)</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center rounded-xl bg-[#0e0e1a]/95 border border-white/10 p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-violet-600/20 text-[#a78bfa] border border-violet-500/30 shadow-md"
                      : "text-[#64748b] hover:text-white border border-transparent"
                  }`}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "list"
                      ? "bg-violet-600/20 text-[#a78bfa] border border-violet-500/30 shadow-md"
                      : "text-[#64748b] hover:text-white border border-transparent"
                  }`}
                  title="List View"
                  aria-label="List View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {paginatedCompanies.length > 0 ? (
            <div>
              {viewMode === "grid" ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {paginatedCompanies.map((company) => {
                    const slug = slugify(company.name);
                    return (
                      <Link
                        href={`/companies/${slug}`}
                        key={company.name}
                        className="glass-card p-5 flex items-center gap-4 hover:border-violet-500/40 hover:bg-violet-600/5 group transition-all duration-300"
                      >
                        {/* Logo */}
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt={`${company.name} logo`}
                            className="w-12 h-12 object-contain bg-white/5 border border-white/10 rounded-xl p-1.5 flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27><rect width=%27100%25%27 height=%27100%25%27 fill=%27%231e1b4b%27/><text x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-family=%27sans-serif%27 font-size=%2740%27 font-weight=%27bold%27 fill=%27%23a78bfa%27>${company.name.substring(0, 1).toUpperCase()}</text></svg>`;
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center font-bold text-violet-400 flex-shrink-0">
                            {company.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="overflow-hidden">
                          <h3 className="text-[0.95rem] font-bold text-white mb-1 truncate group-hover:text-violet-400 transition-colors">
                            {company.name}
                          </h3>
                          <p className="text-xs text-[#64748b]">
                            {company.open_jobs_count} open {company.open_jobs_count === 1 ? "role" : "roles"}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                /* LIST VIEW */
                <div className="flex flex-col gap-3">
                  {paginatedCompanies.map((company) => {
                    const slug = slugify(company.name);
                    return (
                      <div
                        key={company.name}
                        className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-violet-500/40 hover:bg-violet-600/5 group transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          {/* Logo */}
                          {company.logo ? (
                            <img
                              src={company.logo}
                              alt={`${company.name} logo`}
                              className="w-12 h-12 object-contain bg-white/5 border border-white/10 rounded-xl p-1.5 flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27><rect width=%27100%25%27 height=%27100%25%27 fill=%27%231e1b4b%27/><text x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-family=%27sans-serif%27 font-size=%2740%27 font-weight=%27bold%27 fill=%27%23a78bfa%27>${company.name.substring(0, 1).toUpperCase()}</text></svg>`;
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center font-bold text-violet-400 flex-shrink-0">
                              {company.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <h3 className="text-base font-bold text-white group-hover:text-violet-400 transition-colors">
                              {company.name}
                            </h3>
                            <p className="text-xs text-[#a78bfa] font-medium mt-0.5">
                              Global Tech Hub &amp; Hiring Brand
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-white/5 pt-3 sm:pt-0 sm:border-0">
                          <div className="text-left sm:text-right">
                            <span className="text-sm font-semibold text-[#94a3b8]">
                              {company.open_jobs_count} open {company.open_jobs_count === 1 ? "role" : "roles"}
                            </span>
                          </div>
                          <Link
                            href={`/companies/${slug}`}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600/15 text-violet-400 border border-violet-500/20 transition-all duration-300 hover:scale-105 inline-block text-center hover:bg-violet-600/30 hover:text-white"
                          >
                            View Jobs &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5 mt-8">
                  {currentPage === 1 ? (
                    <span className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/10 opacity-40 select-none">
                      &larr; Previous
                    </span>
                  ) : (
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-white/10 hover:bg-white/5"
                    >
                      &larr; Previous
                    </button>
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
                        <button
                          key={pNum}
                          onClick={() => handlePageChange(pNum)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
                            currentPage === pNum
                              ? "bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/30 border border-[#8b5cf6]"
                              : "border border-white/10 hover:bg-white/5 text-[#94a3b8]"
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                  </div>

                  {currentPage === totalPages ? (
                    <span className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/10 opacity-40 select-none">
                      Next &rarr;
                    </span>
                  ) : (
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-white/10 hover:bg-white/5"
                    >
                      Next &rarr;
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 rounded-3xl bg-[#0a0914] border border-[#1e1b4b]/30">
              <span className="text-4xl mb-3 block">🔍</span>
              <h3 className="text-lg font-bold text-white mb-1">No companies found</h3>
              <p className="text-sm text-[#64748b] max-w-xs mx-auto leading-relaxed">
                We couldn't find any companies matching "{searchTerm}". Try checking your spelling or searching for another term.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ══════ Footer ══════ */}
      <footer className="footer mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 md:py-10">
          <div className="footer-grid">
            <div>
              <Link href="/" className="nav-logo text-xl block mb-4">
                Future<span>Talent</span>
              </Link>
              <p className="text-[#64748b] text-sm leading-relaxed max-w-xs">
                AI-curated remote, hybrid & on-site jobs from 200+ sources. Fresh listings every 24 hours.
              </p>
            </div>
            <div>
              <div className="footer-heading">Job Seekers</div>
              <Link href="/jobs" className="footer-link">Browse Jobs</Link>
              <Link href="/blog" className="footer-link">Career Blog</Link>
            </div>
            <div>
              <div className="footer-heading">Employers</div>
              <Link href="/contact" className="footer-link">Partnerships</Link>
            </div>
            <div>
              <div className="footer-heading">Company</div>
              <Link href="/about" className="footer-link">About Us</Link>
              <Link href="/contact" className="footer-link">Contact</Link>
              <Link href="/privacy" className="footer-link">Privacy Policy</Link>
              <Link href="/terms" className="footer-link">Terms of Service</Link>
            </div>
          </div>
          <div className="border-t border-[rgba(255,255,255,0.06)] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[#64748b] text-sm">
            <span>
              © 2026 FutureTalent. All rights reserved. •{" "}
              <Link href="/privacy" className="hover:underline hover:text-white">
                Privacy Policy
              </Link>{" "}
              •{" "}
              <Link href="/terms" className="hover:underline hover:text-white">
                Terms of Service
              </Link>
            </span>
            <span>Built with ♥ for job seekers everywhere</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
