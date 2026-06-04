"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ════════════════════════════════════════════════════════
   CONTACT PAGE — FutureTalent
   AdSense requirement: dedicated contact page with multiple
   contact methods. Includes ContactPage schema for Google.
   ════════════════════════════════════════════════════════ */

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

    const targets = el.querySelectorAll("[data-reveal]");
    targets.forEach((t) => observer.observe(t));

    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function ContactClient() {
  const revealRef = useReveal();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStatus("sent");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      ref={revealRef}
      className="min-h-screen flex flex-col bg-[#06060a] text-white selection:bg-[#34d399] selection:text-black"
    >
      {/* ── ContactPage Schema ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact FutureTalent",
            url: "https://www.futuretalent.online/contact",
            mainEntity: {
              "@type": "Organization",
              name: "FutureTalent",
              url: "https://www.futuretalent.online",
              email: "support@futuretalent.online",
              contactPoint: {
                "@type": "ContactPoint",
                email: "support@futuretalent.online",
                contactType: "customer support",
                availableLanguage: "English",
              },
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
                name: "Contact",
                item: "https://www.futuretalent.online/contact",
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

      {/* ══════ Hero ══════ */}
      <header className="relative pt-28 md:pt-36 pb-12 md:pb-20 px-4 md:px-6 overflow-hidden">
        <div className="absolute top-[-15%] left-[50%] translate-x-[-50%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(52,211,153,0.08)_0%,rgba(99,102,241,0.04)_40%,transparent_70%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1
            data-reveal
            className="reveal-up text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            Get in <span className="gradient-text">Touch</span>
          </h1>
          <p
            data-reveal
            className="reveal-up text-lg md:text-xl text-[#94a3b8] max-w-xl mx-auto leading-relaxed"
          >
            Have a question, feedback, or partnership inquiry? We'd love to
            hear from you. We aim to respond within 24 hours.
          </p>
        </div>
      </header>

      {/* ══════ Main Content ══════ */}
      <main className="flex-1 px-4 md:px-6 pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8">

            {/* ── Contact Form (3 cols) ── */}
            <div
              data-reveal
              className="reveal-up md:col-span-3 glass-card p-8 md:p-10"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                Send Us a Message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-sm font-medium text-[#94a3b8] mb-2"
                    >
                      Your Name *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-[rgba(15,15,22,0.8)] border border-[rgba(255,255,255,0.06)] rounded-xl text-white placeholder-[#475569] outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[rgba(139,92,246,0.3)] transition-all"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-sm font-medium text-[#94a3b8] mb-2"
                    >
                      Email Address *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 bg-[rgba(15,15,22,0.8)] border border-[rgba(255,255,255,0.06)] rounded-xl text-white placeholder-[#475569] outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[rgba(139,92,246,0.3)] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-subject"
                    className="block text-sm font-medium text-[#94a3b8] mb-2"
                  >
                    Subject *
                  </label>
                  <select
                    id="contact-subject"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-[rgba(15,15,22,0.8)] border border-[rgba(255,255,255,0.06)] rounded-xl text-white outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[rgba(139,92,246,0.3)] transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select a topic...</option>
                    <option value="general">General Inquiry</option>
                    <option value="report">Report a Job Listing</option>
                    <option value="feedback">Feedback & Suggestions</option>
                    <option value="partnership">Partnership / Business</option>
                    <option value="bug">Bug Report</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-medium text-[#94a3b8] mb-2"
                  >
                    Message *
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us what's on your mind..."
                    className="w-full px-4 py-3 bg-[rgba(15,15,22,0.8)] border border-[rgba(255,255,255,0.06)] rounded-xl text-white placeholder-[#475569] outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[rgba(139,92,246,0.3)] transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full py-3.5 rounded-xl font-bold text-center transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background:
                      status === "sent"
                        ? "rgba(52, 211, 153, 0.15)"
                        : "linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #22d3ee 100%)",
                    color: status === "sent" ? "#34d399" : "#fff",
                    border:
                      status === "sent"
                        ? "1px solid rgba(52, 211, 153, 0.3)"
                        : "none",
                  }}
                >
                  {status === "idle" && "Send Message →"}
                  {status === "sending" && (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  )}
                  {status === "sent" && "✓ Message Sent Successfully!"}
                  {status === "error" && "⚠ Failed — Try Again"}
                </button>

                {status === "error" && (
                  <p className="text-[#fb7185] text-sm text-center">
                    Something went wrong. You can also email us directly at{" "}
                    <a
                      href="mailto:support@futuretalent.online"
                      className="underline"
                    >
                      support@futuretalent.online
                    </a>
                  </p>
                )}
              </form>
            </div>

            {/* ── Contact Info Sidebar (2 cols) ── */}
            <div className="md:col-span-2 space-y-6">
              {/* Email Card */}
              <div
                data-reveal
                className="reveal-up glass-card p-6"
                style={{ transitionDelay: "0.1s" }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[rgba(139,92,246,0.12)] border border-[rgba(139,92,246,0.25)] flex items-center justify-center text-xl flex-shrink-0">
                    ✉️
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Email</h3>
                    <a
                      href="mailto:support@futuretalent.online"
                      className="text-[#a78bfa] hover:text-white transition-colors text-sm break-all"
                    >
                      support@futuretalent.online
                    </a>
                    <p className="text-xs text-[#64748b] mt-1">
                      We respond within 24 hours
                    </p>
                  </div>
                </div>
              </div>

              {/* Response Time Card */}
              <div
                data-reveal
                className="reveal-up glass-card p-6"
                style={{ transitionDelay: "0.2s" }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[rgba(34,211,238,0.12)] border border-[rgba(34,211,238,0.25)] flex items-center justify-center text-xl flex-shrink-0">
                    ⏱️
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Response Time
                    </h3>
                    <p className="text-sm text-[#94a3b8]">
                      Typically under <strong className="text-white">24 hours</strong> for
                      general inquiries
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Card */}
              <div
                data-reveal
                className="reveal-up glass-card p-6"
                style={{ transitionDelay: "0.3s" }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.25)] flex items-center justify-center text-xl flex-shrink-0">
                    🔗
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Open Source
                    </h3>
                    <a
                      href="https://github.com/MusfiqurRahman12"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#a78bfa] hover:text-white transition-colors text-sm"
                    >
                      github.com/MusfiqurRahman12
                    </a>
                    <p className="text-xs text-[#64748b] mt-1">
                      Report issues & feature requests
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ Quick Links */}
              <div
                data-reveal
                className="reveal-up glass-card p-6"
                style={{ transitionDelay: "0.4s" }}
              >
                <h3 className="text-lg font-bold text-white mb-4">
                  Common Questions
                </h3>
                <div className="space-y-3 text-sm">
                  {[
                    {
                      q: "How do I apply for a job?",
                      a: 'Click "Apply for this role" on any job page — you\'ll be redirected to the company\'s application page.',
                    },
                    {
                      q: "Why did a job disappear?",
                      a: "Jobs are deactivated when they expire. We refresh listings every 24 hours.",
                    },
                    {
                      q: "Can I post a job?",
                      a: "Yes! Visit the Post a Job page in the navigation to submit a listing.",
                    },
                  ].map((item) => (
                    <details
                      key={item.q}
                      className="group border-b border-[rgba(255,255,255,0.06)] pb-3 last:border-0"
                    >
                      <summary className="cursor-pointer text-[#cbd5e1] font-medium group-open:text-white transition-colors flex justify-between items-center">
                        {item.q}
                        <span className="text-[#64748b] group-open:rotate-180 transition-transform text-xs ml-2">
                          ▼
                        </span>
                      </summary>
                      <p className="text-[#94a3b8] mt-2 pl-0">
                        {item.a}
                      </p>
                    </details>
                  ))}
                </div>
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
      `}</style>
    </div>
  );
}
