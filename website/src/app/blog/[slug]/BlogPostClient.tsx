"use client";

import { useEffect, useRef, useState, use } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { fetchNewsBySlug, fetchNews, News } from "../../../lib/api";
import AdUnit from "@/components/AdUnit";
import ReadAloudButton from "@/components/ReadAloudButton";

gsap.registerPlugin(ScrollTrigger);

export default function BlogPostPage({ params, initialArticle }: { params: Promise<{ slug: string }>, initialArticle: News | null }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [article, setArticle] = useState<News | null>(initialArticle);
  const [nextArticle, setNextArticle] = useState<News | null>(null);
  const [loading, setLoading] = useState(!initialArticle);
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  const articleRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadArticle() {
      // If we already have the article from the server, use it and only fetch footer recommendations
      if (initialArticle && initialArticle.slug === slug) {
        try {
          const allNews = await fetchNews(50, 0);
          const currentIndex = allNews.news.findIndex((n) => n.slug === slug);
          if (currentIndex !== -1 && currentIndex < allNews.news.length - 1) {
            setNextArticle(allNews.news[currentIndex + 1]);
          } else if (allNews.news.length > 0) {
            const fallback = allNews.news.find((n) => n.slug !== slug);
            if (fallback) setNextArticle(fallback);
          }
        } catch {
          // Non-critical recommendation loading fallback
        }
        return;
      }

      try {
        const data = await fetchNewsBySlug(slug);
        setArticle(data);

        // Fetch all articles and find the next one after the current
        try {
          const allNews = await fetchNews(50, 0);
          const currentIndex = allNews.news.findIndex((n) => n.slug === slug);
          if (currentIndex !== -1 && currentIndex < allNews.news.length - 1) {
            setNextArticle(allNews.news[currentIndex + 1]);
          } else if (allNews.news.length > 0) {
            // Wrap around to the first article if we're at the end
            const fallback = allNews.news.find((n) => n.slug !== slug);
            if (fallback) setNextArticle(fallback);
          }
        } catch {
          // Non-critical — if fetching next article fails, the section just links to /blog
        }
      } catch (err) {
        console.error("API failed to load article, using fallback mock for display", err);
        setArticle({
          id: 0,
          title: slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          slug: slug,
          excerpt: "Connecting distributed teams is the absolute cornerstone of productivity in a modern remote workforce.",
          content: `
## The Distributed Ecosystem
Distributed workforces represent a fundamental reimagining of organizational structure. Instead of organizing people physically around a desk, teams are structured around synchronous digital workflows and documentation.

## Overcoming Distance and Time Zones
When teams span multiple geographic regions, forcing synchronous presence is a tax on talent and sleep. Embracing asynchronous tools means:
- **Writing over talking:** Decisions, ideas, and statuses are written standardly instead of locked in 30-minute meetings.
- **AI Proxies:** Utilizing digital workflows to represent status without constant manual reporting.
- **Global Pay Parity:** Competing on a world stage means valuing skills over local geographic indexes.

### Key Tools in the Modern Tech Stack
1. **GitHub/GitLab:** For transparent code versioning.
2. **Slack/Discord:** For spontaneous team-building and watercooler conversations.
3. **Notion/Linear:** For unified project tracking and knowledge bases.

## Summary
The companies of the tomorrow are global, asynchronous, and driven by output rather than visual online presence.
          `,
          category: "Remote Work",
          image: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=2070&auto=format&fit=crop",
          author: "Alex Rivers",
          url: "#",
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    }
    loadArticle();
  }, [slug]);

  useEffect(() => {
    if (loading || !article) return;

    // Reading Progress Bar
    const handleScroll = () => {
      if (!articleRef.current) return;
      const { top, height } = articleRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const scrolledVal = windowHeight - top;
      const total = height + windowHeight;
      const percentage = Math.min(Math.max((scrolledVal / total) * 100, 0), 100);
      
      setProgress(percentage);
    };

    const handleScrolledNav = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("scroll", handleScrolledNav);

    // GSAP Animations
    const ctx = gsap.context(() => {
      // Hero Entrance
      gsap.fromTo(
        ".article-meta",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );
      
      gsap.fromTo(
        ".article-title",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, delay: 0.2, ease: "power3.out" }
      );

      gsap.fromTo(
        ".hero-image-container",
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 1.2, delay: 0.4, ease: "expo.out" }
      );

      // Content fade in on scroll
      if (articleRef.current) {
        gsap.fromTo(
          articleRef.current,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: articleRef.current,
              start: "top 85%",
            }
          }
        );
      }
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScrolledNav);
      ctx.revert();
    };
  }, [loading, article]);

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

  if (loading) {
    return (
      <div className="bg-[#020617] min-h-screen pt-40 px-6 flex justify-center text-white font-medium">
        Loading article details...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="bg-[#020617] min-h-screen pt-40 px-6 text-center text-white">
        <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
        <p className="mb-8">This blog post may have been removed or updated.</p>
        <Link href="/blog" className="px-5 py-2 rounded-xl glass-card text-white hover:bg-white/10">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#020617] min-h-screen relative selection:bg-[#34d399] selection:text-black">
      {/* Reading Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-[#34d399] z-50 transition-all duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />

      {/* Navbar */}
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`} id="navbar">
        <div className="navbar-inner">
          <Link href="/" className="nav-logo">
            Future<span>Talent</span>
          </Link>
          <div className="nav-links">
            <Link href="/blog" className="nav-link">Blog</Link>
            <Link href="/blog" className="nav-link flex items-center gap-1">
              ← Back to Blog
            </Link>
            <Link href="/jobs" className="nav-cta-neon">Browse Jobs</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-24 md:pt-32 pb-8 md:pb-12 px-4 md:px-6 max-w-4xl mx-auto" ref={heroRef}>
        <div className="article-meta flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-[#94a3b8] mb-8">
          <span className="text-[#34d399] uppercase tracking-wider">{article.category}</span>
          <span>•</span>
          <span>{formatDate(article.published_at)}</span>
          <span>•</span>
          <span>4 min read</span>
        </div>
        
        <h1 className="article-title text-4xl md:text-6xl lg:text-7xl font-bold text-center text-white leading-tight mb-8 md:mb-12 font-serif">
          {article.title}
        </h1>

        <div className="hero-image-container relative w-full h-[250px] sm:h-[400px] md:h-[550px] rounded-3xl overflow-hidden mb-8 md:mb-12 shadow-2xl shadow-[#34d399]/10 border border-white/5">
          <img 
            src={article.image} 
            alt="Hero" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Main Content & Sidebar */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-16 md:pb-24 grid md:grid-cols-12 gap-6 md:gap-12 relative" ref={articleRef}>
        
        {/* Left Sidebar (Author & Sharing) - Sticky */}
        <div className="md:col-span-3 hidden md:block">
          <div className="sticky top-32">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34d399] to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                {article.author.charAt(0)}
              </div>
              <div>
                <div className="text-white font-bold">{article.author}</div>
                <div className="text-xs text-[#94a3b8]">Verified Publisher</div>
              </div>
            </div>
            
            <div className="h-px w-full bg-white/10 my-6" />
            
            <p className="text-xs text-[#64748b] uppercase tracking-wider font-bold mb-4">Share Article</p>
            <div className="flex gap-3">
              <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">X</button>
              <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">in</button>
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="md:col-span-7">
          {/* Mobile Author */}
          <div className="flex md:hidden items-center gap-4 mb-10 border-b border-white/10 pb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34d399] to-blue-500 flex items-center justify-center text-white font-bold text-xl">
              {article.author.charAt(0)}
            </div>
            <div>
              <div className="text-white font-bold">{article.author}</div>
              <div className="text-xs text-[#94a3b8]">Verified Publisher</div>
            </div>
          </div>

          <ReadAloudButton content={article.content} />

          <article className="prose prose-invert prose-lg max-w-none prose-headings:font-serif prose-headings:font-normal prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-[#cbd5e1] prose-p:leading-relaxed prose-a:text-[#34d399] prose-blockquote:border-l-[#34d399] prose-blockquote:text-[#94a3b8] prose-blockquote:font-style-italic prose-blockquote:bg-white/5 prose-blockquote:p-4 prose-blockquote:rounded-r-xl">
            <div dangerouslySetInnerHTML={{ __html: formatMarkdown(article.content) }} />
          </article>

          {article.url && article.url !== "#" && (
            <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10 text-sm">
              <span className="text-[#64748b]">Original article syndication sourced from </span>
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-[#34d399] font-bold hover:underline">
                {article.author} ↗
              </a>
            </div>
          )}
        </div>

        {/* Right Sidebar (AdSense) */}
        <div className="md:col-span-2 hidden md:block">
          <div className="sticky top-32">
            <p className="text-[10px] text-center text-[#64748b] uppercase tracking-widest mb-2">Advertisement</p>
            <AdUnit slot="2779071234" format="vertical" style={{ minHeight: "600px" }} />
          </div>
        </div>

      </div>

      {/* Next Article Footer */}
      <div className="border-t border-white/10 bg-black/50 py-12 md:py-20 px-6 text-center">
        <p className="text-[#34d399] font-bold uppercase tracking-widest text-sm mb-4">Read Next</p>
        {nextArticle ? (
          <Link href={`/blog/${nextArticle.slug}`} className="group inline-block max-w-3xl">
            <h3 className="text-3xl md:text-5xl font-serif text-white group-hover:text-[#34d399] transition-colors leading-tight">
              {nextArticle.title} →
            </h3>
            <p className="text-[#94a3b8] mt-4 text-lg">{nextArticle.excerpt}</p>
          </Link>
        ) : (
          <Link href="/blog" className="text-3xl md:text-5xl font-serif text-white hover:text-[#34d399] transition-colors inline-block max-w-3xl">
            Explore more articles →
          </Link>
        )}
      </div>

    </div>
  );
}

// Basic markdown formatter
function formatMarkdown(text: string) {
  if (!text) return "";
  
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2' target='_blank'>$1</a>")
    .replace(/\n$/gim, '<br />');

  // Basic list formatting
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  
  return html.replace(/\n\n/g, "<br/><br/>").replace(/\n/g, "<br/>");
}
