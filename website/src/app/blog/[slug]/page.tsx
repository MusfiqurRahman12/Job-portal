"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

// Mock content for the blog article
const ARTICLE_DATA = {
  title: "The Future of Remote Work: What to Expect in 2027",
  content: `
As AI tools become fully integrated into our daily workflows, the traditional concept of an 'office' is shifting from a physical location to a synchronized digital state.

## The Death of the Sync Meeting
For the past five years, remote work meant moving physical meetings to Zoom. In 2027, this is seen as archaic. Modern companies have embraced true asynchronous workflows. When team members span 14 different time zones, demanding synchronous presence is a tax on productivity.

### Enter the AI Proxy
What replaces the meeting? AI agents that can accurately represent your current work state. Instead of asking a colleague "what's the status of the deployment?", you ask their agent, which has real-time context on all their commits, tickets, and focus hours.

## Compensation Reimagined
The debate over "location-based pay" versus "global standard pay" is finally settling. Top-tier engineers are commanding global rates regardless of whether they live in San Francisco or Chiang Mai. Companies that insist on punishing employees for geographic arbitrage are experiencing catastrophic brain drain.

> "Your location is a lifestyle choice, not a valuation of your technical output." — A very smart person in 2026.

## AdSense Placeholder 
*(Imagine a beautifully integrated native ad here)*

## The Tooling Consolidation
We are seeing a massive consolidation of tools. The "SaaS sprawl" of 2023 where teams used 15 different tools to manage a project is ending. Platforms are becoming deeply interconnected ecosystems.

### Final Thoughts
If you want to stay relevant in the 2027 job market, stop optimizing for "being seen online" and start optimizing for "measurable output". The companies of the future don't care if your green dot is active on Slack; they care if your pull requests are merged.
  `,
  author: {
    name: "Alex Rivers",
    role: "Head of Remote Research",
    avatar: "A"
  },
  date: "May 14, 2026",
  category: "Future of Work",
  image: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=2070&auto=format&fit=crop",
};

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const [progress, setProgress] = useState(0);
  const articleRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reading Progress Bar
    const handleScroll = () => {
      if (!articleRef.current) return;
      const { top, height } = articleRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate how much of the article has been scrolled past
      const scrolled = windowHeight - top;
      const total = height + windowHeight;
      const percentage = Math.min(Math.max((scrolled / total) * 100, 0), 100);
      
      setProgress(percentage);
    };

    window.addEventListener("scroll", handleScroll);

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
      ctx.revert();
    };
  }, []);

  return (
    <div className="bg-[#020617] min-h-screen relative selection:bg-[#34d399] selection:text-black">
      {/* Reading Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-[#34d399] z-50 transition-all duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />

      {/* Standalone Minimal Nav */}
      <nav className="absolute top-0 left-0 w-full p-6 z-40 flex justify-between items-center">
        <Link href="/blog" className="text-white/60 hover:text-white transition-colors flex items-center gap-2">
          ← Back to Blog
        </Link>
        <div className="text-white font-bold tracking-widest uppercase text-xs opacity-50">
          RemoteHub Editorial
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-16 px-6 max-w-4xl mx-auto" ref={heroRef}>
        <div className="article-meta flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-[#94a3b8] mb-8">
          <span className="text-[#34d399] uppercase tracking-wider">{ARTICLE_DATA.category}</span>
          <span>•</span>
          <span>{ARTICLE_DATA.date}</span>
          <span>•</span>
          <span>5 min read</span>
        </div>
        
        <h1 className="article-title text-4xl md:text-6xl lg:text-7xl font-bold text-center text-white leading-tight mb-16 font-serif">
          {ARTICLE_DATA.title}
        </h1>

        <div className="hero-image-container relative w-full h-[400px] md:h-[600px] rounded-3xl overflow-hidden mb-16 shadow-2xl shadow-[#34d399]/10 border border-white/5">
          <img 
            src={ARTICLE_DATA.image} 
            alt="Hero" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Main Content & Sidebar */}
      <div className="max-w-6xl mx-auto px-6 pb-32 grid md:grid-cols-12 gap-12 relative" ref={articleRef}>
        
        {/* Left Sidebar (Author & Sharing) - Sticky */}
        <div className="md:col-span-3 hidden md:block">
          <div className="sticky top-32">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34d399] to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                {ARTICLE_DATA.author.avatar}
              </div>
              <div>
                <div className="text-white font-bold">{ARTICLE_DATA.author.name}</div>
                <div className="text-xs text-[#94a3b8]">{ARTICLE_DATA.author.role}</div>
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
          {/* Mobile Author (only shows on small screens) */}
          <div className="flex md:hidden items-center gap-4 mb-10 border-b border-white/10 pb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34d399] to-blue-500 flex items-center justify-center text-white font-bold text-xl">
              {ARTICLE_DATA.author.avatar}
            </div>
            <div>
              <div className="text-white font-bold">{ARTICLE_DATA.author.name}</div>
              <div className="text-xs text-[#94a3b8]">{ARTICLE_DATA.author.role}</div>
            </div>
          </div>

          <article className="prose prose-invert prose-lg max-w-none prose-headings:font-serif prose-headings:font-normal prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-[#cbd5e1] prose-p:leading-relaxed prose-a:text-[#34d399] prose-blockquote:border-l-[#34d399] prose-blockquote:text-[#94a3b8] prose-blockquote:font-style-italic prose-blockquote:bg-white/5 prose-blockquote:p-4 prose-blockquote:rounded-r-xl">
            <div dangerouslySetInnerHTML={{ __html: formatMarkdown(ARTICLE_DATA.content) }} />
          </article>
        </div>

        {/* Right Sidebar (AdSense) */}
        <div className="md:col-span-2 hidden md:block">
          <div className="sticky top-32">
            <p className="text-[10px] text-center text-[#64748b] uppercase tracking-widest mb-2">Advertisement</p>
            <div className="w-full h-[600px] bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#64748b] relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent -translate-y-full animate-[shimmer_3s_infinite]" />
               AdSense Vertical (160x600)
            </div>
          </div>
        </div>

      </div>

      {/* Next Article Footer */}
      <div className="border-t border-white/10 bg-black/50 py-24 px-6 text-center">
        <p className="text-[#34d399] font-bold uppercase tracking-widest text-sm mb-4">Read Next</p>
        <Link href="/blog" className="text-3xl md:text-5xl font-serif text-white hover:text-gray-300 transition-colors inline-block max-w-3xl">
          How to Optimize Your Home Network for Global Remote Jobs →
        </Link>
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

  return html.replace(/\n\n/g, "<br/><br/>");
}
