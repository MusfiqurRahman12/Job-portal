import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchCompanyBySlug, fetchJobsByCompany, getHoursLeft, getCategoryStyle, slugify } from "@/lib/api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate dynamic metadata for company profile pages
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const company = await fetchCompanyBySlug(resolvedParams.slug);

  if (!company) {
    return {
      title: "Company Not Found | FutureTalent",
    };
  }

  return {
    title: `Active Jobs at ${company.name} — Remote & Hybrid | FutureTalent`,
    description: `Discover active remote, hybrid, and on-site job opportunities at ${company.name}. Apply directly to open roles. Updated every 24 hours.`,
    alternates: {
      canonical: `/companies/${resolvedParams.slug}`,
    },
  };
}

const WORKPLACE_BADGES: Record<string, { label: string; icon: string; color: string }> = {
  remote: { label: "Remote", icon: "🏠", color: "#34d399" },
  hybrid: { label: "Hybrid", icon: "🔄", color: "#f59e0b" },
  onsite: { label: "On-Site", icon: "🏢", color: "#6366f1" },
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

export default async function CompanyPage({ params }: PageProps) {
  const resolvedParams = await params;
  const company = await fetchCompanyBySlug(resolvedParams.slug);

  if (!company) {
    notFound();
  }

  const jobs = await fetchJobsByCompany(company.name);

  return (
    <div className="min-h-screen flex flex-col bg-[#06060a] text-white selection:bg-[#34d399] selection:text-black">
      {/* ── JSON-LD Structured Data: Organization & Breadcrumb ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: company.name,
            logo: company.logo || "https://www.futuretalent.online/favicon.ico",
            url: `https://www.futuretalent.online/companies/${resolvedParams.slug}`,
            description: `Active job listings and employment opportunities at ${company.name}.`,
          }),
        }}
      />
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
                name: "Companies",
                item: "https://www.futuretalent.online/companies",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: company.name,
                item: `https://www.futuretalent.online/companies/${resolvedParams.slug}`,
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
            <Link href="/#categories" className="nav-link">Categories</Link>
            <Link href="/companies" className="nav-link active">Companies</Link>
            <Link href="/blog" className="nav-link">Blog</Link>
            <Link href="/jobs" className="nav-cta-neon">Browse Jobs</Link>
          </div>
        </div>
      </nav>

      {/* ══════ Company Profile Header ══════ */}
      <header className="relative pt-24 md:pt-32 pb-10 px-4 md:px-6 overflow-hidden">
        {/* Glow accents */}
        <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(139,92,246,0.1)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Back Button */}
          <Link
            href="/companies"
            className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-white mb-8 transition-colors"
          >
            ← Back to Companies
          </Link>

          {/* Profile Card */}
          <div className="glass-card p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Logo */}
            {company.logo ? (
              <img
                src={company.logo}
                alt={`${company.name} logo`}
                className="w-20 h-20 object-contain bg-white/5 border border-white/10 rounded-2xl p-2.5 flex-shrink-0"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27><rect width=%27100%25%27 height=%27100%25%27 fill=%27%231e1b4b%27/><text x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-family=%27sans-serif%27 font-size=%2740%27 font-weight=%27bold%27 fill=%27%23a78bfa%27>${company.name.substring(0, 1).toUpperCase()}</text></svg>`;
                }}
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center text-2xl font-bold text-violet-400 flex-shrink-0">
                {company.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            {/* Profile Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
                {company.name}
              </h1>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-sm text-[#94a3b8]">
                <span className="font-semibold text-violet-400">
                  {jobs.length} active {jobs.length === 1 ? "listing" : "listings"}
                </span>
                <span className="text-[#334155] hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  🌐 Verified Employer
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ══════ Jobs List Section ══════ */}
      <main className="flex-1 px-4 md:px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-6">
            Open Positions at {company.name}
          </h2>

          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => {
                const hoursLeft = job.expires_at ? getHoursLeft(job.expires_at) : 24;
                const style = getCategoryStyle(job.category);
                const color = style.color || "#8b5cf6";
                const companyLogo = job.company_logo || company.logo || job.company[0];

                return (
                  <div
                    key={job.id}
                    className="glass-card job-card flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left Details */}
                    <div className="flex items-center gap-4">
                      <div
                        className="company-avatar"
                        style={{
                          background: `linear-gradient(135deg, ${color}20, ${color}40)`,
                          border: `1px solid ${color}50`,
                          color: color,
                        }}
                      >
                        {companyLogo.length > 1 && companyLogo.startsWith("http") ? (
                          <img
                            src={companyLogo}
                            alt={job.company}
                            className="w-full h-full object-contain rounded-md p-1"
                          />
                        ) : (
                          companyLogo
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
                              <span
                                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  background: `${wpBadge.color}15`,
                                  color: wpBadge.color,
                                  border: `1px solid ${wpBadge.color}30`,
                                }}
                              >
                                {wpBadge.icon} {wpBadge.label}
                              </span>
                            );
                          })()}
                        </div>
                        {/* Tags */}
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

                    {/* Right Action Controls */}
                    <div className="flex items-center gap-5 md:ml-auto justify-between md:justify-end border-t border-[rgba(255,255,255,0.05)] md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                      <div className="text-left md:text-right hidden sm:block">
                        <div className="font-bold text-white text-sm">{job.salary || "Competitive"}</div>
                        <div className="text-xs text-[#a78bfa] mt-0.5">{job.category}</div>
                      </div>
                      <ExpireBadge hoursLeft={hoursLeft} />
                      <Link
                        href={`/jobs/${job.id}-${slugify(job.title + " " + job.company)}`}
                        className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 inline-block text-center whitespace-nowrap"
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
          ) : (
            <div className="text-center py-20 rounded-3xl bg-[#0a0914] border border-[#1e1b4b]/30">
              <span className="text-4xl mb-3 block">💼</span>
              <h3 className="text-lg font-bold text-white mb-1">No open positions</h3>
              <p className="text-sm text-[#64748b] max-w-xs mx-auto leading-relaxed">
                There are currently no active job listings for {company.name}. They may have recently expired. Check back soon!
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
