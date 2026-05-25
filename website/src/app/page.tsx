"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJobs, fetchJobCount, fetchCategories, getHoursLeft, Job, CategoryCount } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════
   MOCK DATA — Replace with API calls to your Go backend
   ═══════════════════════════════════════════════════════ */

const CATEGORIES = [
  { name: "Engineering", icon: "⚡", count: 2340, color: "#8b5cf6" },
  { name: "Design", icon: "🎨", count: 891, color: "#ec4899" },
  { name: "Marketing", icon: "📈", count: 1205, color: "#f59e0b" },
  { name: "Product", icon: "🚀", count: 734, color: "#22d3ee" },
  { name: "Data Science", icon: "🧠", count: 567, color: "#34d399" },
  { name: "DevOps", icon: "🔧", count: 423, color: "#f97316" },
];

const JOBS = [
  {
    id: 1,
    title: "Senior Full-Stack Engineer",
    company: "Vercel",
    location: "Remote Worldwide",
    salary: "$150k – $200k",
    category: "Engineering",
    tags: ["React", "Next.js", "TypeScript"],
    remote_type: "worldwide",
    hoursLeft: 22,
    color: "#8b5cf6",
  },
  {
    id: 2,
    title: "Lead Product Designer",
    company: "Figma",
    location: "Remote US/EU",
    salary: "$140k – $180k",
    category: "Design",
    tags: ["Figma", "Design Systems", "UX"],
    remote_type: "country",
    hoursLeft: 18,
    color: "#ec4899",
  },
  {
    id: 3,
    title: "ML/AI Research Engineer",
    company: "DeepMind",
    location: "Remote Worldwide",
    salary: "$180k – $280k",
    category: "Data Science",
    tags: ["Python", "PyTorch", "LLMs"],
    remote_type: "worldwide",
    hoursLeft: 14,
    color: "#34d399",
  },
  {
    id: 4,
    title: "Growth Marketing Manager",
    company: "Notion",
    location: "Remote US",
    salary: "$120k – $160k",
    category: "Marketing",
    tags: ["SEO", "Analytics", "Content"],
    remote_type: "country",
    hoursLeft: 8,
    color: "#f59e0b",
  },

  {
    id: 6,
    title: "Senior DevOps Engineer",
    company: "GitLab",
    location: "Remote Worldwide",
    salary: "$130k – $180k",
    category: "DevOps",
    tags: ["Terraform", "CI/CD", "Docker"],
    remote_type: "worldwide",
    hoursLeft: 2,
    color: "#f97316",
  },
];

const TICKER_ITEMS = [
  "2,340 Engineering Jobs",
  "891 Design Roles",
  "48 Countries Covered",
  "AI-Curated Listings",
  "Updated Every 24 Hours",
  "1,205 Marketing Positions",
  "100% Remote Verified",
  "567 Data Science Openings",
];

/* ═══════════════════════════════════════════════════════
   HELPER: Expiration Badge
   ═══════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function Home() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const jobsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const [apiJobs, setApiJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [apiCategories, setApiCategories] = useState<CategoryCount[]>([]);

  // Newsletter State & Handler
  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "loading" | "success" | "error" | "invalid" | "exists">("idle");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setSubStatus("invalid");
      return;
    }

    setSubStatus("loading");
    try {
      // Check if email already exists
      const { data: existing, error: checkError } = await supabase
        .from("subscribers")
        .select("email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        setSubStatus("exists");
        return;
      }

      // Insert new subscriber
      const { error: insertError } = await supabase
        .from("subscribers")
        .insert([{ email: email.trim().toLowerCase() }]);

      if (insertError) throw insertError;

      setSubStatus("success");
      setEmail("");
    } catch (err) {
      console.error("Failed to subscribe:", err);
      setSubStatus("error");
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const jobsParams = activeFilter === "All" ? undefined : { category: activeFilter };
        const jobsRes = await fetchJobs(jobsParams);
        setApiJobs(jobsRes.jobs || []);
        
        const count = await fetchJobCount();
        setTotalJobs(count);
        
        const cats = await fetchCategories();
        setApiCategories(cats || []);
      } catch (err) {
        console.error("Failed to load data from API, using mock fallback", err);
      }
    }
    loadData();
  }, [activeFilter]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ─── GSAP ANIMATIONS ─── */
  useEffect(() => {
    // Small delay to ensure DOM is fully painted before GSAP measures
    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        // ── Hero entrance timeline ──
        const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
        heroTl
          .fromTo(".hero-badge", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 })
          .fromTo(".hero-title-line", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.15 }, "-=0.3")
          .fromTo(".hero-subtitle", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.4")
          .fromTo(".search-container", { opacity: 0, y: 30, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.7 }, "-=0.3")
          .fromTo(".hero-tags .tag-chip", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.08 }, "-=0.3");

        // ── Hero glow pulse ──
        gsap.to(".hero-glow", {
          scale: 1.15,
          opacity: 0.9,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        gsap.to(".hero-glow-secondary", {
          scale: 1.25,
          opacity: 0.7,
          duration: 5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 1,
        });

        // ── Stats counter animation ──
        if (statsRef.current) {
          const statNumbers = statsRef.current.querySelectorAll(".stat-number");
          statNumbers.forEach((el) => {
            const target = parseInt(el.getAttribute("data-value") || "0", 10);
            ScrollTrigger.create({
              trigger: el,
              start: "top 90%",
              toggleActions: "play none none none",
              onEnter: () => {
                gsap.fromTo(
                  el,
                  { textContent: "0" },
                  {
                    textContent: target,
                    duration: 2,
                    ease: "power2.out",
                    snap: { textContent: 1 },
                    onUpdate: function () {
                      const val = Math.round(parseFloat(gsap.getProperty(el, "textContent") as string));
                      el.textContent = val.toLocaleString() + (el.getAttribute("data-suffix") || "");
                    },
                  }
                );
              },
              once: true,
            });
          });

          // Stats container reveal
          gsap.fromTo(
            statsRef.current,
            { opacity: 0, y: 50 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: statsRef.current,
                start: "top 90%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        // ── Categories stagger reveal ──
        if (categoriesRef.current) {
          const catCards = categoriesRef.current.querySelectorAll(".category-card");
          gsap.fromTo(
            catCards,
            { opacity: 0, y: 60, scale: 0.9 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.6,
              stagger: 0.1,
              ease: "back.out(1.4)",
              scrollTrigger: {
                trigger: categoriesRef.current,
                start: "top 90%",
                toggleActions: "play none none none",
              },
            }
          );

          const catHeading = categoriesRef.current.querySelector(".section-heading");
          if (catHeading) {
            gsap.fromTo(
              catHeading,
              { opacity: 0, x: -40 },
              {
                opacity: 1,
                x: 0,
                duration: 0.7,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: categoriesRef.current,
                  start: "top 90%",
                  toggleActions: "play none none none",
                },
              }
            );
          }
        }

        // ── Job cards stagger reveal ──
        if (jobsRef.current) {
          const jobCards = jobsRef.current.querySelectorAll(".job-card");
          gsap.fromTo(
            jobCards,
            { opacity: 0, y: 40 },
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              stagger: 0.12,
              ease: "power3.out",
              scrollTrigger: {
                trigger: jobsRef.current,
                start: "top 90%",
                toggleActions: "play none none none",
              },
            }
          );

          const jobHeading = jobsRef.current.querySelector(".section-heading");
          if (jobHeading) {
            gsap.fromTo(
              jobHeading,
              { opacity: 0, x: -40 },
              {
                opacity: 1,
                x: 0,
                duration: 0.7,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: jobsRef.current,
                  start: "top 90%",
                  toggleActions: "play none none none",
                },
              }
            );
          }
        }

        // ── CTA reveal ──
        if (ctaRef.current) {
          gsap.fromTo(
            ctaRef.current,
            { opacity: 0, scale: 0.92, y: 30 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: ctaRef.current,
                start: "top 90%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        // ── Parallax grid lines on scroll ──
        gsap.to(".hero-bg-grid", {
          scrollTrigger: {
            trigger: ".hero-section",
            start: "top top",
            end: "bottom top",
            scrub: 1.5,
          },
          y: 80,
          opacity: 0,
        });

        // Force a ScrollTrigger refresh after all animations are set up
        ScrollTrigger.refresh();
      });

      return () => ctx.revert();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* ═══════════════════════════════════════════════
          NAVBAR
          ═══════════════════════════════════════════════ */}
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`} id="navbar">
        <div className="navbar-inner">
          <a href="/" className="nav-logo">
            Future<span>Talent</span>
          </a>
          <div className="nav-links">
            <a href="#categories" className="nav-link">Categories</a>
            <a href="#" className="nav-link">Companies</a>
            <a href="/blog" className="nav-link">Blog</a>
            <a href="/jobs" className="nav-cta-neon">Browse Jobs</a>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════ */}
      <section className="hero-section" ref={heroRef}>
        <div className="hero-bg-grid" />
        <div className="hero-glow" />
        <div className="hero-glow-secondary" />

        <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 pt-32 pb-20 text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className="hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.06)] mb-8">
            <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
            <span className="text-sm font-medium text-[#a78bfa]">
              Live — 4,200+ remote jobs updated every 24h
            </span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight leading-[1.05] mb-6">
            <span className="hero-title-line block">Find your next</span>
            <span className="hero-title-line block gradient-text">remote career,</span>
            <span className="hero-title-line block">anywhere.</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle text-lg md:text-xl text-[#94a3b8] max-w-2xl mb-10 leading-relaxed">
            AI-curated remote jobs from 200+ sources worldwide.
            Fresh listings every 24 hours — apply before they expire.
          </p>

          {/* Search */}
          <form className="search-container w-full mb-8" onSubmit={(e) => {
            e.preventDefault();
            const val = (document.getElementById("search-input") as HTMLInputElement).value;
            router.push(val ? `/jobs?search=${encodeURIComponent(val)}` : '/jobs');
          }}>
            <input
              type="text"
              className="search-bar"
              placeholder="Search roles, companies, or skills..."
              id="search-input"
            />
            <button type="submit" className="search-btn" id="search-btn">
              Search Jobs
            </button>
          </form>

          {/* Tags */}
          <div className="hero-tags flex flex-wrap justify-center gap-2">
            {["All", "Engineering", "Design", "Marketing", "Data Science", "DevOps"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setActiveFilter(t);
                  // Smoothly scroll to the jobs list section so the user sees the filtered results
                  setTimeout(() => {
                    document.getElementById("jobs")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
                className={`tag-chip ${activeFilter === t ? "active" : ""}`}
                id={`filter-${t.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          TICKER
          ═══════════════════════════════════════════════ */}
      <div className="ticker-wrap" ref={tickerRef}>
        <div className="ticker-content">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="ticker-item">
              <span className="ticker-dot" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════════ */}
      <section className="py-20 px-6" ref={statsRef}>
        <div className="max-w-5xl mx-auto">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number" data-value={totalJobs > 0 ? totalJobs : 4200} data-suffix="+">0</div>
              <div className="stat-label">Active Jobs</div>
            </div>
            <div className="stat-item">
              <div className="stat-number" data-value="200" data-suffix="+">0</div>
              <div className="stat-label">Sources Crawled</div>
            </div>
            <div className="stat-item">
              <div className="stat-number" data-value="48">0</div>
              <div className="stat-label">Countries</div>
            </div>
            <div className="stat-item">
              <div className="stat-number" data-value="24" data-suffix="h">0</div>
              <div className="stat-label">Refresh Cycle</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CATEGORIES
          ═══════════════════════════════════════════════ */}
      <section className="py-16 px-6" ref={categoriesRef} id="categories">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <h2 className="section-heading mb-3">
              Browse by <span className="gradient-text">category</span>
            </h2>
            <p className="section-subheading">
              Explore thousands of remote opportunities across every field.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => {
              const apiCat = apiCategories.find(c => c.name === cat.name);
              const count = apiCat ? apiCat.count : cat.count;
              return (
                <div
                  key={cat.name}
                  className="glass-card category-card"
                  id={`category-${cat.name.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => {
                    router.push(`/jobs?category=${encodeURIComponent(cat.name)}`);
                  }}
                >
                  <div
                    className="category-icon"
                    style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}30` }}
                  >
                    {cat.icon}
                  </div>
                  <div className="text-sm font-semibold mb-1">{cat.name}</div>
                  <div className="text-xs text-[#64748b]">{count.toLocaleString()} jobs</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          AD SLOT — TOP
          ═══════════════════════════════════════════════ */}
      <section className="px-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="ad-slot">AdSense — Leaderboard (728×90)</div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          JOB LISTINGS
          ═══════════════════════════════════════════════ */}
      <section className="py-16 px-6" ref={jobsRef} id="jobs">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
            <div>
              <h2 className="section-heading mb-3">
                Latest <span className="gradient-text">remote jobs</span>
              </h2>
              <p className="section-subheading">
                Jobs auto-expire after 24 hours. Apply before time runs out.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#64748b]">
              <span className="w-2 h-2 rounded-full bg-[#34d399]" />
              Updated just now
            </div>
          </div>

          <div className="space-y-3">
            {(apiJobs.length > 0 ? apiJobs : JOBS.filter(
              (j) => activeFilter === "All" || j.category === activeFilter
            )).map((job: any) => {
              const hoursLeft = job.expires_at ? getHoursLeft(job.expires_at) : job.hoursLeft;
              const color = job.color || CATEGORIES.find(c => c.name === job.category)?.color || "#8b5cf6";
              const title = job.title;
              const company = job.company;
              const company_logo = job.company_logo || company[0];
              const location = job.location;
              const remote_type = job.remote_type;
              const tags = job.tags || [];
              const salary = job.salary || "Competitive";
              const category = job.category;
              const id = job.id;

              return (
              <div
                key={id}
                className="glass-card job-card flex flex-col md:flex-row md:items-center justify-between gap-4"
                id={`job-${id}`}
              >
                {/* Left: Avatar + Info */}
                <div className="flex items-center gap-4">
                  <div
                    className="company-avatar"
                    style={{
                      background: `linear-gradient(135deg, ${color}20, ${color}40)`,
                      border: `1px solid ${color}50`,
                      color: color,
                    }}
                  >
                    {company_logo && company_logo.length > 1 && company_logo.startsWith("http") ? (
                      <img src={company_logo} alt={company} className="w-full h-full object-contain rounded-md p-1" />
                    ) : (
                      company_logo
                    )}
                  </div>
                  <div>
                    <h3 className="text-[1.05rem] font-bold text-white mb-1">{title}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#94a3b8]">
                      <span className="font-medium">{company}</span>
                      <span className="text-[#334155]">•</span>
                      <span className="inline-flex items-center gap-1">
                        {remote_type === "worldwide" ? "🌍" : "📍"} {location}
                      </span>
                    </div>
                    {/* Tags */}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {tags.slice(0, 3).map((tag: string) => (
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

                {/* Right: Salary + Expire + CTA */}
                <div className="flex items-center gap-5 md:ml-auto">
                  <div className="text-right hidden md:block">
                    <div className="font-bold text-white text-sm">{salary}</div>
                    <div className="text-xs text-[#64748b] mt-0.5">{category}</div>
                  </div>
                  <ExpireBadge hoursLeft={hoursLeft} />
                  <a href={`/jobs/${id}`}
                    className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 inline-block text-center"
                    style={{
                      background: `${color}15`,
                      color: color,
                      border: `1px solid ${color}30`,
                    }}
                    id={`apply-${id}`}
                  >
                    View Job →
                  </a>
                </div>
              </div>
            )})}
          </div>

          {/* Load More */}
          <div className="text-center mt-10">
            <button
              onClick={() => router.push('/jobs')}
              className="px-8 py-3 rounded-full border border-[rgba(255,255,255,0.08)] text-[#94a3b8] font-medium text-sm hover:border-[#8b5cf6] hover:text-white transition-all duration-300"
              id="load-more"
            >
              View all jobs →
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          AD SLOT — MID
          ═══════════════════════════════════════════════ */}
      <section className="px-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="ad-slot">AdSense — In-Feed (Responsive)</div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA BANNER
          ═══════════════════════════════════════════════ */}
      <section className="py-20 px-6" ref={ctaRef}>
        <div className="max-w-4xl mx-auto text-center glass-card py-16 px-8 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 30% 50%, rgba(139,92,246,0.08), transparent 50%), radial-gradient(circle at 70% 50%, rgba(34,211,238,0.06), transparent 50%)",
            }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
              Never miss a <span className="gradient-text">perfect role</span>
            </h2>
            <p className="text-[#94a3b8] text-lg mb-8 max-w-lg mx-auto">
              Get AI-matched job alerts delivered to your inbox. Be the first to
              apply — listings expire in 24 hours.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3 justify-center max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="you@email.com"
                  className="flex-1 px-5 py-3 rounded-xl bg-[rgba(15,15,22,0.8)] border border-[rgba(255,255,255,0.06)] text-white outline-none focus:border-[#8b5cf6] transition-colors"
                  id="email-input"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (subStatus !== "idle") setSubStatus("idle");
                  }}
                  disabled={subStatus === "loading" || subStatus === "success"}
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}
                  id="subscribe-btn"
                  disabled={subStatus === "loading" || subStatus === "success"}
                >
                  {subStatus === "loading" ? "Subscribing..." : "Subscribe"}
                </button>
              </div>

              {subStatus === "success" && (
                <p className="text-[#34d399] text-sm font-semibold mt-2 text-center">
                  🎉 Success! You've successfully subscribed to job alerts.
                </p>
              )}
              {subStatus === "exists" && (
                <p className="text-[#a78bfa] text-sm font-semibold mt-2 text-center">
                  ℹ️ This email is already subscribed to job alerts!
                </p>
              )}
              {subStatus === "invalid" && (
                <p className="text-[#fb7185] text-sm font-semibold mt-2 text-center">
                  ⚠️ Please enter a valid email address.
                </p>
              )}
              {subStatus === "error" && (
                <p className="text-[#fb7185] text-sm font-semibold mt-2 text-center">
                  ❌ Something went wrong. Please try again.
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════ */}
      <footer className="footer">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="footer-grid">
            <div>
              <a href="/" className="nav-logo text-xl block mb-4">
                Future<span className="gradient-text">Talent</span>
              </a>
              <p className="text-[#64748b] text-sm leading-relaxed max-w-xs">
                AI-curated remote jobs from 200+ sources. Fresh listings every
                24 hours — the fastest way to find your next remote career.
              </p>
            </div>
            <div>
              <div className="footer-heading">Job Seekers</div>
              <a href="#" className="footer-link">Browse Jobs</a>
              <a href="#" className="footer-link">Companies</a>
              <a href="#" className="footer-link">Salary Guide</a>
              <a href="#" className="footer-link">Career Blog</a>
            </div>
            <div>
              <div className="footer-heading">Employers</div>
              <a href="#" className="footer-link">Post a Job</a>
              <a href="#" className="footer-link">Pricing</a>
              <a href="#" className="footer-link">Featured Listing</a>
              <a href="#" className="footer-link">API Access</a>
            </div>
            <div>
              <div className="footer-heading">Company</div>
              <a href="#" className="footer-link">About Us</a>
              <Link href="/privacy" className="footer-link">Privacy Policy</Link>
              <a href="#" className="footer-link">Terms of Service</a>
              <a href="#" className="footer-link">Contact</a>
            </div>
          </div>
          <div className="border-t border-[rgba(255,255,255,0.06)] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[#64748b] text-sm">
            <span>© 2026 FutureTalent. All rights reserved. • <Link href="/privacy" className="hover:underline hover:text-white">Privacy Policy</Link></span>
            <span>Powered by AI • Built with ♥ for remote workers</span>
          </div>
        </div>
      </footer>
    </>
  );
}
