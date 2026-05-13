"use client";

import { useEffect, useState } from "react";
import { fetchJobById, Job, getHoursLeft } from "@/lib/api";
import Link from "next/link";
import ReactMarkdown from 'react-markdown'; // We'll need to install this, or just use dangerouslySetInnerHTML

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJob() {
      try {
        const data = await fetchJobById(params.id);
        setJob(data);
      } catch (err) {
        // Fallback for demo
        console.error("API failed, using mock data for demo", err);
        setJob({
          id: params.id,
          title: "Mock AI/ML Engineer",
          company: "Demo Corp",
          company_logo: "D",
          location: "Remote Worldwide",
          description: "## About the Role\n\nThis is a mock description because the Go API is not running. We are looking for an amazing engineer to join our team...\n\n### Requirements\n\n- React\n- Go\n- PostgreSQL",
          source: "RemoteHub",
          url: "#",
          remote_type: "worldwide",
          category: "Engineering",
          tags: ["Go", "React"],
          salary: "$120k",
          posted_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
          created_at: new Date().toISOString(),
          is_active: true,
        });
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-6 flex justify-center text-white">
        Loading job details...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-6 text-center text-white">
        <h1 className="text-3xl font-bold mb-4">Job Not Found</h1>
        <p className="mb-8">This job may have expired or been removed.</p>
        <Link href="/" className="px-5 py-2 rounded-xl glass-card text-white hover:bg-white/10">
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  const hoursLeft = getHoursLeft(job.expires_at);

  return (
    <div className="min-h-screen pt-32 pb-16 px-6 relative z-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-block text-[#94a3b8] hover:text-white mb-8 transition-colors">
          ← Back to all jobs
        </Link>

        {/* Job Header */}
        <div className="glass-card p-8 md:p-12 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6">
            <span className={`expire-badge ${hoursLeft <= 4 ? "urgent" : hoursLeft <= 12 ? "expiring" : "fresh"}`}>
              {hoursLeft <= 4 && "⚠ "}
              {hoursLeft}h left to apply
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
                {job.salary && (
                  <>
                    <span>•</span>
                    <span className="text-[#34d399]">{job.salary}</span>
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
        <div className="ad-slot mb-8" style={{ height: "120px" }}>
          AdSense — Content Banner
        </div>

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
            
            <div className="ad-slot" style={{ height: "250px" }}>
              AdSense — Square
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Very basic markdown to HTML for fallback (since we don't have a markdown library installed yet)
function formatMarkdown(text: string) {
  if (!text) return "";
  
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2' target='_blank'>$1</a>")
    .replace(/\n$/gim, '<br />');

  // Basic list formatting
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/<\/li>\n<li>/gim, '</li><li>');
  
  return html.replace(/\n/g, "<br/>");
}
