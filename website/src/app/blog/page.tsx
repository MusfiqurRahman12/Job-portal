"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const FEATURED_POST = {
  title: "The Future of Remote Work: What to Expect in 2027",
  excerpt: "As AI tools become fully integrated into our daily workflows, the traditional concept of an 'office' is shifting from a physical location to a synchronized digital state.",
  author: "Alex Rivers",
  date: "May 14, 2026",
  category: "Future of Work",
  slug: "future-of-remote-work-2027",
  image: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=2070&auto=format&fit=crop",
};

const BLOG_POSTS = [
  {
    id: 1,
    title: "How to Optimize Your Home Network for Global Remote Jobs",
    excerpt: "Latency is the enemy of remote productivity. Here are 5 ways to guarantee a stable connection no matter where you are.",
    category: "Tech Guide",
    date: "May 10, 2026",
    slug: "optimize-home-network",
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Why Asynchronous Communication is Becoming the Standard",
    excerpt: "Companies are ditching the 9-to-5 synchronous meetings for a more flexible, documentation-first approach.",
    category: "Productivity",
    date: "May 08, 2026",
    slug: "asynchronous-communication",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "Navigating Taxes as a Digital Nomad in Europe",
    excerpt: "A comprehensive guide to understanding tax residency and digital nomad visas in Spain, Portugal, and Croatia.",
    category: "Nomad Life",
    date: "May 05, 2026",
    slug: "taxes-digital-nomad-europe",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop",
  },
  {
    id: 4,
    title: "Top 10 Remote Collaboration Tools You Aren't Using Yet",
    excerpt: "Move beyond Slack and Zoom. These underground tools are changing how global teams build software.",
    category: "Tools",
    date: "May 02, 2026",
    slug: "top-remote-collaboration-tools",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop",
  },
];

export default function BlogPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    });

    return () => ctx.revert();
  }, []);

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

        {/* Featured Post */}
        <div 
          ref={featuredRef}
          className="relative w-full h-[500px] rounded-[2rem] overflow-hidden mb-16 group cursor-pointer border border-white/10 shadow-2xl shadow-[#34d399]/5"
        >
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src={FEATURED_POST.image} 
              alt={FEATURED_POST.title}
              className="featured-img w-full h-[120%] object-cover object-center -top-[10%] relative transition-transform duration-1000 group-hover:scale-105"
            />
          </div>
          
          {/* Editorial Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent" />
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
            <Link href={`/blog/${FEATURED_POST.slug}`} className="block">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  {FEATURED_POST.category}
                </span>
                <span className="text-[#94a3b8] text-sm font-medium">{FEATURED_POST.date}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight group-hover:text-[#34d399] transition-colors duration-300">
                {FEATURED_POST.title}
              </h2>
              <p className="text-[#cbd5e1] text-lg max-w-3xl line-clamp-2 md:line-clamp-3 mb-6">
                {FEATURED_POST.excerpt}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#34d399] to-blue-500 flex items-center justify-center text-white font-bold">
                  {FEATURED_POST.author.charAt(0)}
                </div>
                <span className="text-white font-medium">{FEATURED_POST.author}</span>
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
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="w-8 h-1 bg-[#34d399] rounded-full" />
            Latest Articles
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8" ref={gridRef}>
            {BLOG_POSTS.map((post) => (
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
                  <div className="text-[#64748b] text-sm font-medium mb-3">{post.date}</div>
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

      </div>
    </div>
  );
}
