"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/* ════════════════════════════════════════════════════════
   ABOUT PAGE — FutureTalent
   E-E-A-T focused: establishes publisher identity, mission,
   editorial process, and transparency — all critical for
   AdSense approval and Google ranking signals.
   ════════════════════════════════════════════════════════ */

// Intersection Observer hook for scroll-reveal animations
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    // Observe the container and all children with data-reveal
    const targets = el.querySelectorAll("[data-reveal]");
    targets.forEach((t) => observer.observe(t));

    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function AboutClient() {
  const revealRef = useReveal();

  return (
    <div
      ref={revealRef}
      className="min-h-screen flex flex-col bg-[#06060a] text-white selection:bg-[#34d399] selection:text-black"
    >
      {/* ── JSON-LD Structured Data: Organization Schema ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "FutureTalent",
            url: "https://www.futuretalent.online",
            description:
              "AI-powered job aggregator curating remote, hybrid, and on-site opportunities from 200+ sources daily.",
            foundingDate: "2026",
            contactPoint: {
              "@type": "ContactPoint",
              email: "support@futuretalent.online",
              contactType: "customer support",
              url: "https://www.futuretalent.online/contact",
            },
          }),
        }}
      />

      {/* ── Breadcrumb JSON-LD ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://www.futuretalent.online",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "About",
                item: "https://www.futuretalent.online/about",
              },
            ],
          }),
        }}
      />

      {/* ══════ Navbar ══════ */}
      <nav className="navbar scrolled">
        <div className="navbar-inner">
          <Link href="/" className="nav-logo">
            Future<span>Talent</span>
          </Link>
          <div className="nav-links">
            <Link href="/jobs" className="nav-link">Browse Jobs</Link>
            <Link href="/#categories" className="nav-link">Categories</Link>
            <Link href="/blog" className="nav-link">Blog</Link>
            <Link href="/admin" className="nav-cta">Post a Job</Link>
          </div>
        </div>
      </nav>

      {/* ══════ Hero Section ══════ */}
      <header className="relative pt-28 md:pt-36 pb-16 md:pb-24 px-4 md:px-6 overflow-hidden">
        {/* Decorative glows */}
        <div className="absolute top-[-15%] left-[50%] translate-x-[-50%] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(139,92,246,0.10)_0%,rgba(99,102,241,0.05)_40%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-[20%] right-[-8%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(34,211,238,0.06)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div
            data-reveal
            className="reveal-up inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(139,92,246,0.25)] bg-[rgba(139,92,246,0.06)] text-[#a78bfa] text-sm font-medium mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
            Trusted by thousands of job seekers
          </div>

          <h1
            data-reveal
            className="reveal-up text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            The Team Behind{" "}
            <span className="gradient-text">FutureTalent</span>
          </h1>

          <p
            data-reveal
            className="reveal-up text-lg md:text-xl text-[#94a3b8] max-w-2xl mx-auto leading-relaxed"
          >
            We're building the fastest way to discover career opportunities
            worldwide — powered by AI, curated with care, and completely free
            for job seekers.
          </p>
        </div>
      </header>

      {/* ══════ Main Content ══════ */}
      <main className="flex-1 px-4 md:px-6 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* ── Mission Card ── */}
          <article
            data-reveal
            className="reveal-up glass-card p-8 md:p-12 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle,rgba(139,92,246,0.12),transparent_70%)] pointer-events-none" />
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[rgba(139,92,246,0.12)] border border-[rgba(139,92,246,0.25)] flex items-center justify-center text-2xl flex-shrink-0">
                🎯
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  Our Mission
                </h2>
                <p className="text-sm text-[#64748b] font-medium">
                  Why we built FutureTalent
                </p>
              </div>
            </div>
            <div className="space-y-4 text-[#cbd5e1] leading-relaxed">
              <p>
                Finding a great job shouldn't require visiting dozens of
                websites. <strong>FutureTalent</strong> was born from a simple
                frustration: the best opportunities are scattered across
                hundreds of company career pages, niche job boards, and social
                media — and most people miss them.
              </p>
              <p>
                We built an AI-powered aggregator that scans <strong>200+
                sources</strong> every 24 hours, rewrites job descriptions for
                clarity and consistency, and delivers them in a single,
                beautifully designed experience. Whether you're looking for a
                remote engineering role, a hybrid marketing position, or an
                on-site leadership opportunity — we've got you covered.
              </p>
              <p>
                Our platform is <strong>100% free for job seekers</strong>. No
                sign-up walls, no hidden fees, no data selling. Just jobs.
              </p>
            </div>
          </article>

          {/* ── How It Works — 3 Column ── */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "🔍",
                title: "Automated Curation",
                description:
                  "Our scraper crawls 200+ job boards and company ATS systems every day. Advanced algorithms structure and format each listing for clarity, consistency, and SEO — ensuring you get clean, readable job descriptions.",
                color: "rgba(139, 92, 246, 0.12)",
                border: "rgba(139, 92, 246, 0.25)",
              },
              {
                icon: "⚡",
                title: "Always Fresh",
                description:
                  "Jobs are refreshed every 24 hours via automated GitHub Actions workflows. Expired listings are automatically deactivated and removed, so you never waste time on dead links.",
                color: "rgba(34, 211, 238, 0.12)",
                border: "rgba(34, 211, 238, 0.25)",
              },
              {
                icon: "🌍",
                title: "Truly Global",
                description:
                  "From San Francisco to Berlin, São Paulo to Singapore — we aggregate remote, hybrid, and on-site opportunities worldwide. Filter by location, category, or work type to find your perfect fit.",
                color: "rgba(52, 211, 153, 0.12)",
                border: "rgba(52, 211, 153, 0.25)",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                data-reveal
                className="reveal-up glass-card p-6 md:p-8 text-center"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4"
                  style={{
                    background: item.color,
                    border: `1px solid ${item.border}`,
                  }}
                >
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* ── Numbers Bar ── */}
          <div
            data-reveal
            className="reveal-up stats-grid"
          >
            {[
              { number: "200+", label: "Sources Crawled" },
              { number: "24h", label: "Refresh Cycle" },
              { number: "100%", label: "Free Forever" },
              { number: "50+", label: "Countries" },
            ].map((stat) => (
              <div key={stat.label} className="stat-item">
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* ── Editorial Process & Transparency ── */}
          <article
            data-reveal
            className="reveal-up glass-card p-8 md:p-12"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[rgba(34,211,238,0.12)] border border-[rgba(34,211,238,0.25)] flex items-center justify-center text-2xl flex-shrink-0">
                📋
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  Editorial Standards
                </h2>
                <p className="text-sm text-[#64748b] font-medium">
                  Quality you can trust
                </p>
              </div>
            </div>
            <div className="space-y-4 text-[#cbd5e1] leading-relaxed">
              <p>
                Every job listing on FutureTalent goes through a rigorous
                quality pipeline before it reaches you:
              </p>
              <ul className="space-y-3">
                {[
                  "Automated scrapers fetch raw listings from verified sources — never user-submitted spam.",
                  "Advanced parsers format job details into a consistent, professional layout with clear sections (About the Role, Responsibilities, Requirements, Benefits).",
                  "Thin content is automatically filtered — jobs with insufficient detail are rejected before publishing.",
                  "Application deadlines are extracted and enforced — expired jobs are automatically deactivated within hours.",
                  "Duplicate detection prevents the same job from appearing twice, even across different sources.",
                ].map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-[rgba(52,211,153,0.15)] border border-[rgba(52,211,153,0.3)] flex items-center justify-center text-xs text-[#34d399] mt-0.5 flex-shrink-0">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p>
                Our career blog offers unique, actionable insights and expert-reviewed
                guides to help remote workers and job seekers excel in their job hunts.
              </p>
            </div>
          </article>

          {/* ── Tech Stack Card ── */}
          <article
            data-reveal
            className="reveal-up glass-card p-8 md:p-12"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.25)] flex items-center justify-center text-2xl flex-shrink-0">
                ⚙️
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  Built With Modern Tech
                </h2>
                <p className="text-sm text-[#64748b] font-medium">
                  Our technology stack
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "Frontend", value: "Next.js + React (Vercel)" },
                { label: "Scraper Engine", value: "Go (Golang)" },
                { label: "Database", value: "PostgreSQL (Supabase)" },
                { label: "Parsing & Curation", value: "Automated Structuring" },
                { label: "Automation", value: "GitHub Actions (CI/CD)" },
                { label: "Search", value: "Schema.org + JSON-LD" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-3"
                >
                  <span className="text-[#64748b] text-sm font-medium">
                    {item.label}
                  </span>
                  <span className="text-white text-sm font-semibold">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </article>

          {/* ── CTA Section ── */}
          <div
            data-reveal
            className="reveal-up glass-card p-8 md:p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08),transparent_70%)] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Ready to Find Your Next Role?
              </h2>
              <p className="text-[#94a3b8] mb-8 max-w-lg mx-auto">
                Browse hundreds of curated opportunities updated daily. No
                account needed — just start exploring.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/jobs"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold bg-white text-black hover:bg-gray-200 transition-all hover:scale-[1.03]"
                >
                  Browse Jobs →
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold border border-[rgba(139,92,246,0.4)] text-white hover:bg-[rgba(139,92,246,0.08)] transition-all hover:scale-[1.03]"
                >
                  Get in Touch
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ══════ Footer ══════ */}
      <footer className="footer mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 md:py-10">
          <div className="footer-grid">
            <div>
              <Link href="/" className="nav-logo text-xl block mb-4">
                Future<span className="gradient-text">Talent</span>
              </Link>
              <p className="text-[#64748b] text-sm leading-relaxed max-w-xs">
                AI-curated remote, hybrid & on-site jobs from 200+ sources.
                Fresh listings every 24 hours.
              </p>
            </div>
            <div>
              <div className="footer-heading">Job Seekers</div>
              <Link href="/jobs" className="footer-link">Browse Jobs</Link>
              <Link href="/blog" className="footer-link">Career Blog</Link>
            </div>
            <div>
              <div className="footer-heading">Employers</div>
              <Link href="/admin" className="footer-link">Post a Job</Link>
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
            <span>Powered by AI • Built with ♥ for job seekers everywhere</span>
          </div>
        </div>
      </footer>

      {/* ══════ Scroll-Reveal CSS ══════ */}
      <style jsx global>{`
        /* Reveal animation base */
        [data-reveal] {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }

        [data-reveal].revealed {
          opacity: 1;
          transform: translateY(0);
        }

        /* Staggered child reveals */
        [data-reveal]:nth-child(2) { transition-delay: 0.1s; }
        [data-reveal]:nth-child(3) { transition-delay: 0.2s; }
        [data-reveal]:nth-child(4) { transition-delay: 0.3s; }
      `}</style>
    </div>
  );
}
