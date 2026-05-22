"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { fetchNews, News } from "../../lib/api";

gsap.registerPlugin(ScrollTrigger);

export default function BlogPage() {
  const [featuredPost, setFeaturedPost] = useState<News | null>(null);
  const [blogPosts, setBlogPosts] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  const headerRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const loadNews = async () => {
      try {
        const response = await fetchNews(15);
        if (!active) return;
        if (response.news && response.news.length > 0) {
          setFeaturedPost(response.news[0]);
          setBlogPosts(response.news.slice(1));
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
  }, []);

  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      // Header Animation
      gsap.fromTo(
        ".blog-title",
        { opacity: 0, y: 40, rotationX: -20 },
        { opacity: 1, y: 0, rotationX: 0, duration: 1, ease: "power4.out" }
      );
      
      gsap.fromTo(
        ".blog-subtitle",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: "power3.out" }
      );

      // Featured Post Parallax & Reveal
      if (featuredRef.current) {
        gsap.fromTo(
          featuredRef.current,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 1.2, delay: 0.3, ease: "expo.out" }
        );

        gsap.to(".featured-img", {
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
          gsap.fromTo(
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

    return () => ctx.revert();
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
    <div className="min-h-screen pt-32 pb-24 px-6 relative z-10 selection:bg-[#34d399] selection:text-black">
      {/* Background ambient glow specific to blog */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#34d399]/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-16" ref={headerRef}>
          <h1 className="blog-title text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 tracking-tight mb-6" style={{ perspective: "1000px" }}>
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
        ) : !featuredPost ? (
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
            <div 
              ref={featuredRef}
              className="relative w-full h-[500px] rounded-[2rem] overflow-hidden mb-16 group cursor-pointer border border-white/10 shadow-2xl shadow-[#34d399]/5"
            >
              <div className="absolute inset-0 overflow-hidden">
                <img 
                  src={featuredPost.image} 
                  alt={featuredPost.title}
                  className="featured-img w-full h-[120%] object-cover object-center -top-[10%] relative transition-transform duration-1000 group-hover:scale-105"
                />
              </div>
              
              {/* Editorial Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent" />
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
                <Link href={`/blog/${featuredPost.slug}`} className="block">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                      {featuredPost.category}
                    </span>
                    <span className="text-[#94a3b8] text-sm font-medium">{formatDate(featuredPost.published_at)}</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight group-hover:text-[#34d399] transition-colors duration-300">
                    {featuredPost.title}
                  </h2>
                  <p className="text-[#cbd5e1] text-lg max-w-3xl line-clamp-2 md:line-clamp-3 mb-6">
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

            {/* Ad Slot */}
            <div className="w-full h-[100px] rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#64748b] mb-16 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
              AdSense — Content Banner (Responsive)
            </div>

            {/* Recent Posts Grid */}
            {blogPosts.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <span className="w-8 h-1 bg-[#34d399] rounded-full" />
                  Latest Articles
                </h3>
                
                <div className="grid md:grid-cols-2 gap-8" ref={gridRef}>
                  {blogPosts.map((post) => (
                    <Link 
                      href={`/blog/${post.slug}`} 
                      key={post.id}
                      className="blog-card group block relative rounded-3xl bg-[#0f172a]/80 border border-white/5 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-[#34d399]/30 hover:shadow-xl hover:shadow-[#34d399]/10"
                    >
                      <div className="h-56 w-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300 z-10" />
                        <img 
                          src={post.image} 
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute top-4 left-4 z-20">
                          <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 text-xs font-bold uppercase tracking-wider">
                            {post.category}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-8">
                        <div className="text-[#64748b] text-sm font-medium mb-3">{formatDate(post.published_at)}</div>
                        <h4 className="text-xl md:text-2xl font-bold text-white mb-3 leading-snug group-hover:text-[#34d399] transition-colors duration-300">
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
          </>
        )}
      </div>
    </div>
  );
}
