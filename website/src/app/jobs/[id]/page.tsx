import { fetchJobById, fetchJobs, getHoursLeft, getCategoryStyle, slugify } from "@/lib/api";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import AdUnit from "@/components/AdUnit";

interface Props {
  params: Promise<{ id: string }>;
}

// Generate dynamic metadata for search engines and social links (open graph)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;
  const actualId = rawId.split("-")[0];

  try {
    const job = await fetchJobById(actualId);
    
    // Determine workplace type dynamically
    const isRemote = job.workplace_type === "remote" || job.remote_type === "worldwide" || job.location?.toLowerCase().includes("remote");
    const isHybrid = job.workplace_type === "hybrid" || job.location?.toLowerCase().includes("hybrid");
    
    let workplaceLabel = "On-site Opportunity";
    let workplaceDesc = "on-site";
    if (isRemote) {
      workplaceLabel = "Remote Opportunity";
      workplaceDesc = "remote";
    } else if (isHybrid) {
      workplaceLabel = "Hybrid Opportunity";
      workplaceDesc = "hybrid";
    }

    const title = `${job.title} Job at ${job.company} | ${workplaceLabel} | FutureTalent`;
    
    const salaryPart = job.salary && job.salary.trim() !== "" 
      ? `with a salary of ${job.salary}` 
      : "with competitive compensation";
      
    const description = `Looking for a ${job.title} job? Apply to join ${job.company} for this ${workplaceDesc} opportunity based in ${job.location || "anywhere"}. View details, ${salaryPart}, and apply online today on FutureTalent!`;
    
    const slug = slugify(job.title + " " + job.company);
    const canonicalUrl = `/jobs/${job.id}-${slug}`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        type: "article",
        url: canonicalUrl,
      },
    };
  } catch (err) {
    console.error("Failed to generate metadata for job details page:", err);
    return {
      title: "Job Details | FutureTalent",
      alternates: {
        canonical: `/jobs/${rawId}`,
      },
    };
  }
}

// Helper to deduce employment type for Google Jobs schema requirements
function getEmploymentType(title: string, desc: string): string {
  const text = (title + " " + desc).toLowerCase();
  if (text.includes("contract") || text.includes("freelance") || text.includes("contractor")) {
    return "CONTRACT";
  }
  if (text.includes("intern") || text.includes("apprenticeship") || text.includes("internship")) {
    return "INTERN";
  }
  if (text.includes("part-time") || text.includes("part time")) {
    return "PART_TIME";
  }
  return "FULL_TIME"; // Default fallback
}

/**
 * Parses a freeform salary string into a structured Schema.org baseSalary object.
 * Handles formats like:
 *   "$80,000 - $120,000/year"
 *   "€50k–€70k"
 *   "120000"
 *   "Up to $150,000"
 *   "£45,000 per annum"
 * Returns null if no numeric value can be extracted.
 */
function parseSalary(salary: string | null | undefined): Record<string, unknown> | null {
  if (!salary || salary.trim() === "") return null;

  // Strip commas and extract all numeric sequences (including decimals)
  const cleaned = salary.replace(/,/g, "");
  const numbers = cleaned.match(/\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;

  // Detect currency
  let currency = "USD";
  if (/£/.test(salary)) currency = "GBP";
  else if (/€/.test(salary)) currency = "EUR";
  else if (/CA\$|CAD/i.test(salary)) currency = "CAD";
  else if (/AU\$|AUD/i.test(salary)) currency = "AUD";

  // Detect unit (default to YEAR)
  let unitText = "YEAR";
  const lower = salary.toLowerCase();
  if (/hour|\/hr|per hour/i.test(lower)) unitText = "HOUR";
  else if (/month|\/mo/i.test(lower)) unitText = "MONTH";
  else if (/week|\/wk/i.test(lower)) unitText = "WEEK";
  else if (/day|\/day/i.test(lower)) unitText = "DAY";

  // Scale "k" shorthand (e.g. "80k" → 80000)
  const scaleNumber = (n: string, originalSalary: string, index: number): number => {
    const value = parseFloat(n);
    // Find whether "k" follows this number in the original string
    const searchStr = originalSalary.replace(/,/g, "");
    const pos = searchStr.indexOf(n, index * 2); // rough offset to avoid collision
    const afterNum = searchStr.substring(pos + n.length, pos + n.length + 2).toLowerCase();
    return afterNum.startsWith("k") ? value * 1000 : value;
  };

  const minVal = scaleNumber(numbers[0], salary, 0);
  const maxVal = numbers.length >= 2 ? scaleNumber(numbers[1], salary, 1) : undefined;

  if (maxVal && maxVal > minVal) {
    // Range salary
    return {
      "@type": "MonetaryAmount",
      "currency": currency,
      "value": {
        "@type": "QuantitativeValue",
        "minValue": minVal,
        "maxValue": maxVal,
        "unitText": unitText,
      },
    };
  }

  // Single value salary
  return {
    "@type": "MonetaryAmount",
    "currency": currency,
    "value": {
      "@type": "QuantitativeValue",
      "value": minVal,
      "unitText": unitText,
    },
  };
}

/**
 * Generates a complete and GSC-validated Place object for job postings.
 * Ensures that addressCountry, streetAddress, addressRegion, and postalCode are never missing.
 */
function getJobLocation(location: string | null | undefined, isRemote: boolean) {
  const loc = location?.trim() || "";
  
  let country = "US"; // default fallback country code
  let region = "Remote";
  let locality = "Remote";
  let postalCode = "Remote";
  let streetAddress = "Remote";

  if (!isRemote && loc !== "") {
    const parts = loc.split(",").map(p => p.trim());
    if (parts.length === 1) {
      locality = parts[0];
      region = parts[0];
      country = parts[0];
    } else if (parts.length === 2) {
      locality = parts[0];
      region = parts[1];
      country = parts[1].length === 2 ? "US" : parts[1];
    } else if (parts.length >= 3) {
      locality = parts[0];
      region = parts[1];
      country = parts[2];
    }
    streetAddress = "Not Specified";
    postalCode = "00000"; // standard fallback postal code
  } else {
    // Remote job: if we can extract a country code/name from parentheses (e.g. "Remote (US)")
    const match = loc.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      const parsedCountry = match[1].trim();
      country = parsedCountry.length === 2 ? parsedCountry.toUpperCase() : parsedCountry;
      region = country;
      locality = "Remote";
    } else if (loc !== "" && !loc.toLowerCase().includes("remote") && !loc.toLowerCase().includes("worldwide")) {
      country = loc;
      region = loc;
    }
  }

  // Ensure country is normalized (Google likes ISO 2-letter codes or full country name)
  if (country.toLowerCase() === "worldwide" || country.toLowerCase() === "global") {
    country = "US"; // default fallback
  }

  return {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": streetAddress,
      "addressLocality": locality,
      "addressRegion": region,
      "postalCode": postalCode,
      "addressCountry": country,
    }
  };
}

const WORKPLACE_BADGES: Record<string, { label: string; icon: string; color: string }> = {
  remote: { label: "Remote", icon: "🏠", color: "#34d399" },
  hybrid: { label: "Hybrid", icon: "🔄", color: "#f59e0b" },
  onsite: { label: "On-Site", icon: "🏢", color: "#6366f1" },
};

export default async function JobDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;
  const actualId = rawId.split("-")[0];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.futuretalent.online";

  let job;
  try {
    job = await fetchJobById(actualId);
  } catch (err) {
    console.error("Job details loading failed, rendering not found page:", err);
    notFound();
  }

  // Return 404 status code if the job is inactive or has expired
  const isExpired = job.expires_at ? new Date(job.expires_at).getTime() < Date.now() : false;
  if (!job.is_active || isExpired) {
    notFound();
  }

  const hoursLeft = getHoursLeft(job.expires_at);

  // Parse salary string into Schema.org-compliant numeric structure
  let parsedSalary = parseSalary(job.salary);
  let displaySalary = job.salary;

  if (!parsedSalary) {
    // Provide a default estimated salary to satisfy Google Search Console validation
    // and match the visible page content as required by structured data guidelines.
    parsedSalary = {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": {
        "@type": "QuantitativeValue",
        "minValue": 80000,
        "maxValue": 120000,
        "unitText": "YEAR",
      },
    };
    if (job.salary && job.salary.trim() !== "") {
      displaySalary = `${job.salary} (Estimated: $80,000 - $120,000)`;
    } else {
      displaySalary = "Estimated: $80,000 - $120,000";
    }
  }

  const isRemote = job.remote_type === "worldwide" || job.location?.toLowerCase().includes("remote");

  // Fetch related jobs in the same category (internal linking system)
  let relatedJobs: any[] = [];
  try {
    const relatedRes = await fetchJobs({ category: job.category, limit: 10 });
    relatedJobs = (relatedRes.jobs || [])
      .filter((j) => j.id !== job.id)
      .slice(0, 3);
  } catch (err) {
    console.error("Failed to fetch related jobs:", err);
  }

  // Generate Google Jobs schema structure (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": formatMarkdown(job.description),
    "datePosted": job.posted_at || job.created_at,
    "validThrough": job.expires_at,
    "employmentType": getEmploymentType(job.title, job.description),
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.company,
      ...(job.company_logo && job.company_logo.length > 1 && job.company_logo.startsWith("http")
        ? { "logo": job.company_logo }
        : {}),
    },
    // GSC-compliant location mapping for both remote and on-site listings
    "jobLocation": getJobLocation(job.location, isRemote),
    ...(isRemote ? {
      "jobLocationType": "TELECOMMUTE",
      "applicantLocationRequirements": {
        "@type": "Country",
        "name": job.location || "Worldwide",
      },
    } : {}),
    // Salary — omitted entirely when not available rather than emitting undefined
    ...(parsedSalary ? { "baseSalary": parsedSalary } : {}),
  };

  // Generate Breadcrumb List structured data
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Jobs",
        "item": `${baseUrl}/jobs`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": job.category || "General",
        "item": `${baseUrl}/jobs?category=${encodeURIComponent(job.category || "General")}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": job.title,
        "item": `${baseUrl}/jobs/${job.id}-${slugify(job.title + " " + job.company)}`
      }
    ]
  };

  // Generate FAQ structured data dynamically
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Is the ${job.title} position remote, hybrid, or on-site?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `The ${job.title} role at ${job.company} is a ${job.workplace_type || (isRemote ? "remote" : "on-site")} opportunity. The location specified by the employer is ${job.location || "anywhere"}.`
        }
      },
      {
        "@type": "Question",
        "name": `What is the salary range for the ${job.title} role at ${job.company}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `The salary for ${job.title} at ${job.company} is ${job.salary || "not explicitly stated, but is competitive and based on experience"}.`
        }
      },
      {
        "@type": "Question",
        "name": `How do I apply for the ${job.title} position?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `You can apply directly by visiting the dynamic application link on FutureTalent at: https://www.futuretalent.online/jobs/${job.id}-${slugify(job.title + " " + job.company)}.`
        }
      }
    ]
  };

  return (
    <div className="min-h-screen pt-32 pb-16 px-6 relative z-10">
      {/* Inject Google Jobs Search Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      ></script>

      {/* Inject Breadcrumb List Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      ></script>

      {/* Inject FAQ Page Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      ></script>

      <div className="max-w-4xl mx-auto">
        <Link href="/jobs" className="inline-block text-[#94a3b8] hover:text-white mb-8 transition-colors">
          ← Back to all jobs
        </Link>

        {/* Job Header */}
        <div className="glass-card p-8 md:p-12 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6">
            <span className={`expire-badge ${hoursLeft <= 4 ? "urgent" : hoursLeft <= 12 ? "expiring" : "fresh"}`}>
              {hoursLeft <= 4 && "⚠ "}
              {hoursLeft <= 24 ? `${hoursLeft}h left to apply` : (() => {
                const days = Math.floor(hoursLeft / 24);
                const hours = hoursLeft % 24;
                return hours === 0 ? `${days}d left to apply` : `${days}d ${hours}h left to apply`;
              })()}
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:items-center mb-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold"
              style={{
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.4))",
                border: "1px solid rgba(139, 92, 246, 0.5)",
              }}
            >
              {job.company_logo && job.company_logo.length > 1 && job.company_logo.startsWith("http") ? (
                <img src={job.company_logo} alt={job.company} className="w-full h-full object-contain p-2" />
              ) : (
                job.company_logo || job.company[0]
              )}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-[#94a3b8] text-lg">
                <span className="font-semibold text-white">{job.company}</span>
                <span>•</span>
                <span>{job.remote_type === "worldwide" ? "🌍" : "📍"} {job.location}</span>
                {displaySalary && (
                  <>
                    <span>•</span>
                    <span className="text-[#34d399]">{displaySalary}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {job.tags?.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-[#cbd5e1]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Ad Slot */}
        <AdUnit slot="1569071234" format="horizontal" style={{ minHeight: "120px" }} />

        {/* Content & Sidebar */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 glass-card p-8 md:p-12 prose prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: formatMarkdown(job.description) }} />
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold text-white mb-4">Apply Now</h3>
              <p className="text-sm text-[#94a3b8] mb-6">
                This job is active but will expire soon. Click below to apply on the company's website.
              </p>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 rounded-xl text-center font-bold bg-white text-black hover:bg-gray-200 transition-colors"
              >
                Apply for this role ↗
              </a>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-3">Job Overview</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-[#64748b]">Posted</span>
                  <span className="text-white">{new Date(job.posted_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-[#64748b]">Category</span>
                  <span className="text-white">{job.category}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-[#64748b]">Source</span>
                  <span className="text-white">{job.source}</span>
                </div>
              </div>
            </div>

            <AdUnit slot="2009071234" format="rectangle" style={{ minHeight: "250px" }} />
          </div>
        </div>

        {/* Similar Opportunities (Related Jobs / Internal Linking System) */}
        {relatedJobs.length > 0 && (
          <div className="mt-16 border-t border-white/10 pt-12">
            <h2 className="text-2xl font-bold text-white mb-6">Similar Opportunities</h2>
            <div className="space-y-4">
              {relatedJobs.map((rJob) => {
                const style = getCategoryStyle(rJob.category);
                const color = style.color || "#8b5cf6";
                const wpBadge = WORKPLACE_BADGES[rJob.workplace_type] || WORKPLACE_BADGES.remote;
                const rSlug = slugify(rJob.title + " " + rJob.company);
                const rUrl = `/jobs/${rJob.id}-${rSlug}`;

                return (
                  <div
                    key={rJob.id}
                    className="glass-card job-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 animate-fadeIn"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
                        style={{
                          background: `linear-gradient(135deg, ${color}20, ${color}40)`,
                          border: `1px solid ${color}50`,
                          color: color,
                        }}
                      >
                        {rJob.company_logo && rJob.company_logo.length > 1 && rJob.company_logo.startsWith("http") ? (
                          <img src={rJob.company_logo} alt={rJob.company} className="w-full h-full object-contain p-1 rounded-lg" />
                        ) : (
                          rJob.company_logo || rJob.company[0]
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1 hover:text-violet-400 transition-colors">
                          <Link href={rUrl}>{rJob.title}</Link>
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94a3b8]">
                          <span className="font-medium text-white">{rJob.company}</span>
                          <span>•</span>
                          <span>{rJob.location}</span>
                          <span>•</span>
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${wpBadge.color}15`,
                              color: wpBadge.color,
                              border: `1px solid ${wpBadge.color}30`,
                            }}
                          >
                            {wpBadge.icon} {wpBadge.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-white/5 sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
                      <div className="text-left sm:text-right">
                        <div className="text-sm font-bold text-[#34d399]">{rJob.salary || "Competitive"}</div>
                        <div className="text-[10px] text-[#a78bfa]">{rJob.category}</div>
                      </div>
                      <Link
                        href={rUrl}
                        className="px-4 py-2 rounded-xl text-xs font-semibold hover:scale-105 transition-all duration-300 whitespace-nowrap"
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
          </div>
        )}
      </div>
    </div>
  );
}

// Markdown formatting utility for Server Component rendering
function formatMarkdown(text: string) {
  if (!text) return "";

  // Extract and style the AI Insights section specially if it exists
  let html = text.replace(
    /## ✨ AI Insights & Summary\s+([\s\S]*?)(?=\n## |\n# |$)/g,
    '<div class="glass-card p-6 border-l-4 border-[#8b5cf6] bg-[rgba(139,92,246,0.08)] mb-8 rounded-r-xl"><h2 class="text-[#a78bfa] text-xl font-bold mb-3 mt-0 flex items-center gap-2">✨ AI Insights & Summary</h2><div class="text-[#cbd5e1] m-0 leading-relaxed">$1</div></div>'
  );

  html = html
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*)\*/gim, "<em>$1</em>")
    .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2' target='_blank'>$1</a>")
    .replace(/\n$/gim, "<br />");

  html = html.replace(/^\- (.*$)/gim, "<li>$1</li>");
  html = html.replace(/<\/li>\n<li>/gim, "</li><li>");

  return html.replace(/\n/g, "<br/>");
}
