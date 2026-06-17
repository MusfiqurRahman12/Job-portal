"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchNews, News } from "../../lib/api";
import AdUnit from "@/components/AdUnit";

export default function BlogPage() {
  const [featuredPost, setFeaturedPost] = useState<News | null>(null);
  const [blogPosts, setBlogPosts] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const headerRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let active = true;
    const loadNews = async () => {
      setLoading(true);
      try {
        const offset = (currentPage - 1) * pageSize;
        const response = await fetchNews(pageSize, offset);
        if (!active) return;
        
        setTotalCount(response.count);

        if (response.news && response.news.length > 0) {
          if (currentPage === 1) {
            setFeaturedPost(response.news[0]);
            setBlogPosts(response.news.slice(1));
          } else {
            setFeaturedPost(null);
            setBlogPosts(response.news);
          }
        } else {
          setFeaturedPost(null);
          setBlogPosts([]);
        }
      } catch (err) {
        console.error("Failed to load news:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadNews();
    return () => {
      active = false;
    };
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({
      top: headerRef.current ? headerRef.current.offsetTop - 40 : 0,
      behavior: "smooth",
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize);

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

  useEffect(() => {
    if (loading) return;

    let ctx: any;
    const initGsap = async () => {
      const { default: gsapInstance } = await import("gsap");
      const { ScrollTrigger: ScrollTriggerInstance } = await import("gsap/ScrollTrigger");
      gsapInstance.registerPlugin(ScrollTriggerInstance);

      ctx = gsapInstance.context(() => {
        // Header Animation
        gsapInstance.fromTo(
          ".blog-title",
          { opacity: 0, y: 40, rotationX: -20 },
          { opacity: 1, y: 0, rotationX: 0, duration: 1, ease: "power4.out" }
        );
        
        gsapInstance.fromTo(
          ".blog-subtitle",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: "power3.out" }
        );

        // Featured Post Parallax & Reveal
        if (featuredRef.current) {
          gsapInstance.fromTo(
            featuredRef.current,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 1.2, delay: 0.3, ease: "expo.out" }
          );

          gsapInstance.to(".featured-img", {
            yPercent: 20,
            ease: "none",
            scrollTrigger: {
              trigger: featuredRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        }

        // Grid Items Stagger
        if (gridRef.current) {
          const cards = gridRef.current.querySelectorAll(".blog-card");
          if (cards.length > 0) {
            gsapInstance.fromTo(
              cards,
              { opacity: 0, y: 50 },
              {
                opacity: 1,
                y: 0,
                stagger: 0.15,
                duration: 0.8,
                ease: "back.out(1.2)",
                scrollTrigger: {
                  trigger: gridRef.current,
                  start: "top 85%",
                  toggleActions: "play none none none",
                },
              }
            );
          }
        }
      });
    };
    initGsap();

    return () => {
      if (ctx) ctx.revert();
    };
  }, [loading]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`} id="navbar">
        <div className="navbar-inner">
          <Link href="/" className="nav-logo">
            Future<span>Talent</span>
          </Link>
          <div className="nav-links">
            <Link href="/blog" className="nav-link">Blog</Link>
            <Link href="/jobs" className="nav-cta-neon">Browse Jobs</Link>
          </div>
        </div>
      </nav>

      <div className="min-h-screen pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6 relative z-10 selection:bg-[#34d399] selection:text-black">
        {/* Background ambient glow specific to blog */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#34d399]/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="text-center mb-10 md:mb-14" ref={headerRef}>
            <h1 className="blog-title text-3xl sm:text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 tracking-tight mb-6" style={{ perspective: "1000px" }}>
              The Remote <span className="text-[#34d399]">Pulse</span>
            </h1>
            <p className="blog-subtitle text-lg text-[#94a3b8] max-w-2xl mx-auto">
              Insights, strategies, and stories from the frontier of global remote work. Curated by AI, written for humans.
            </p>
          </header>

        {loading ? (
          /* Premium Skeleton Loader */
          <div className="space-y-12">
            <div className="w-full h-[500px] rounded-[2rem] bg-white/5 animate-pulse border border-white/10" />
            <div className="grid md:grid-cols-2 gap-8">
              <div className="h-96 rounded-3xl bg-white/5 animate-pulse border border-white/10" />
              <div className="h-96 rounded-3xl bg-white/5 animate-pulse border border-white/10" />
            </div>
          </div>
        ) : (!featuredPost && blogPosts.length === 0) ? (
          /* Empty State Fallback */
          <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-white/10 p-8">
            <h3 className="text-2xl font-bold text-white mb-4">No Articles Found</h3>
            <p className="text-[#94a3b8] max-w-md mx-auto mb-6">
              Our automated crawler is currently scanning remote work networks and technology journals to rewrite high-quality insights for you. Please check back shortly!
            </p>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {featuredPost && (
              <div 
                ref={featuredRef}
                className="relative w-full h-[420px] sm:h-[450px] md:h-[500px] rounded-[2rem] overflow-hidden mb-8 md:mb-12 group cursor-pointer border border-white/10 shadow-2xl shadow-[#34d399]/5"
              >
                <div className="absolute inset-0 overflow-hidden">
                  <img 
                    src={featuredPost.image} 
                    alt={featuredPost.title}
                    className="featured-img w-full h-[120%] object-cover object-center -top-[10%] relative transition-transform duration-1000 group-hover:scale-105"
                    decoding="async"
                    fetchPriority="high"
                  />
                </div>
                
                {/* Editorial Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent" />
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 md:p-12">
                  <Link href={`/blog/${featuredPost.slug}`} className="block">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 rounded-full bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                        {featuredPost.category}
                      </span>
                      <span className="text-[#94a3b8] text-sm font-medium">{formatDate(featuredPost.published_at)}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 leading-tight group-hover:text-[#34d399] transition-colors duration-300">
                      {featuredPost.title}
                    </h2>
                    <p className="text-[#cbd5e1] text-base md:text-lg max-w-3xl hidden sm:line-clamp-2 md:line-clamp-3 mb-6">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#34d399] to-blue-500 flex items-center justify-center text-white font-bold">
                        {featuredPost.author.charAt(0)}
                      </div>
                      <span className="text-white font-medium">{featuredPost.author}</span>
                    </div>
                  </Link>
                </div>
              </div>
            )}

            {/* Ad Slot */}
            <AdUnit slot="2199071234" format="horizontal" style={{ minHeight: "100px", marginBottom: "2rem" }} />

            {/* Recent Posts Grid */}
            {blogPosts.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <span className="w-8 h-1 bg-[#34d399] rounded-full" />
                  Latest Articles
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6 sm:gap-8" ref={gridRef}>
                  {blogPosts.map((post) => (
                    <Link 
                      href={`/blog/${post.slug}`} 
                      key={post.id}
                      className="blog-card group block relative rounded-3xl bg-[#0f172a]/80 border border-white/5 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-[#34d399]/30 hover:shadow-xl hover:shadow-[#34d399]/10"
                    >
                      <div className="h-48 sm:h-56 w-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300 z-10" />
                        <img 
                          src={post.image} 
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="absolute top-4 left-4 z-20">
                          <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 text-xs font-bold uppercase tracking-wider">
                            {post.category}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-5 sm:p-8">
                        <div className="text-[#64748b] text-sm font-medium mb-3">{formatDate(post.published_at)}</div>
                        <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 leading-snug group-hover:text-[#34d399] transition-colors duration-300">
                          {post.title}
                        </h4>
                        <p className="text-[#94a3b8] line-clamp-2">
                          {post.excerpt}
                        </p>
                        
                        <div className="mt-6 flex items-center text-[#34d399] text-sm font-bold">
                          Read Article 
                          <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-12 border-t border-white/5 pt-8">
                <button
                  disabled={currentPage === 1 || loading}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer text-white"
                >
                  <span>←</span> <span className="hidden sm:inline ml-1">Prev</span>
                </button>

                {getPageNumbers().map((p, idx) => {
                  if (p === "...") {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-3 text-gray-500 font-bold">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p as number)}
                      disabled={loading}
                      className={`w-10 h-10 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        currentPage === p
                          ? "bg-[#34d399] text-black shadow-lg shadow-[#34d399]/20"
                          : "bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage === totalPages || loading}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer text-white"
                >
                  <span className="hidden sm:inline mr-1">Next</span> <span>→</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}
