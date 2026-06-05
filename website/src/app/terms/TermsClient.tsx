"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function TermsClient() {
  const [scrolled, setScrolled] = useState(true);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#06060a] text-white selection:bg-[#34d399] selection:text-black">
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
                name: "Terms",
                item: "https://www.futuretalent.online/terms",
              },
            ],
          }),
        }}
      />

      {/* Navbar */}
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

      {/* Main Content */}
      <main className="flex-1 pt-20 md:pt-28 pb-10 md:pb-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8 md:p-12 mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
              Terms of <span className="gradient-text">Service</span>
            </h1>
            <p className="text-sm text-[#64748b] mb-10">
              Last Updated: June 5, 2026
            </p>

            <div className="space-y-8 text-[#cbd5e1] leading-relaxed">
              <section>
                <p className="text-lg text-[#94a3b8]">
                  Welcome to <strong>FutureTalent</strong>. These Terms of Service ("Terms") govern your access to and use of our website located at <Link href="/" className="text-[#34d399] hover:underline">futuretalent.online</Link> ("Site"). By accessing or using the Site, you agree to be bound by these Terms.
                </p>
              </section>

              <hr className="border-white/10" />

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">1. Acceptance of Terms</h2>
                <p>
                  By visiting our website and accessing the information, resources, services, and tools we provide, you understand and agree to accept and adhere to the terms and conditions stated in this policy. If you do not agree to these Terms, please do not use our Site.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">2. Job Listings & External Links</h2>
                <p>
                  FutureTalent is a job aggregator. We use automated algorithms and advanced structural parsing to gather, extract, and format job listings from third-party websites for readability.
                </p>
                <p>
                  We do not hire employees directly, nor do we act as an employer, agent, or representative of any company posting jobs on our platform. We are not responsible for the accuracy, legality, content, or availability of external job postings. When you apply for a job, you will be redirected to the employer's official website. It is your responsibility to verify the legitimacy of any employer or job opportunity before submitting personal information or accepting employment.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">3. Use of the Site & Restrictions</h2>
                <p>
                  You are granted a non-exclusive, non-transferable, revocable license to access and use the Site strictly in accordance with these Terms. As a condition of your use of the Site, you warrant that you will not use the Site for any purpose that is unlawful or prohibited by these Terms.
                </p>
                <p>
                  You agree not to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use any automated system, including "robots," "spiders," or "offline readers," to access the Site in a manner that sends more request messages to our servers than a human can reasonably produce in the same period (except for recognized public search engine crawlers and approved AI search bots).</li>
                  <li>Bypass, circumvent, or disable any security-related features of the Site.</li>
                  <li>Use our platform to distribute spam, malware, or other malicious content.</li>
                  <li>Attempt to gain unauthorized access to our admin tools, database, or server infrastructure.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">4. Intellectual Property</h2>
                <p>
                  All content included as part of the Service, such as text, graphics, logos, images, as well as the compilation thereof, and any software used on the Site, is the property of FutureTalent or its suppliers and protected by copyright and other laws that protect intellectual property and proprietary rights.
                </p>
                <p>
                  FutureTalent logos and brand elements are trademarks of FutureTalent. All third-party company names, logos, and trademarks appearing in job listings belong to their respective owners.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">5. Disclaimer of Warranties & Limitation of Liability</h2>
                <p>
                  THE SITE AND ALL CONTENT AND SERVICES DELIVERED ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. FUTURETALENT DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
                <p>
                  IN NO EVENT SHALL FUTURETALENT, ITS FOUNDERS, OR ITS COLLABORATORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF OR IN ANY WAY CONNECTED WITH YOUR USE OF THE SITE, WHETHER BASED ON CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">6. Changes to the Terms</h2>
                <p>
                  We reserve the right to change or modify these Terms at any time without prior notice. The date of the last revision will be displayed at the top of this page. Your continued use of the Site following any changes indicates your acceptance of the new Terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">7. Contact Us</h2>
                <p>
                  If you have any questions or suggestions about our Terms of Service, please contact us at{" "}
                  <Link href="/contact" className="text-[#34d399] hover:underline">
                    futuretalent.online/contact
                  </Link>{" "}
                  or email us directly at{" "}
                  <a href="mailto:support@futuretalent.online" className="text-[#34d399] hover:underline">
                    support@futuretalent.online
                  </a>.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
          <div className="border-t border-[rgba(255,255,255,0.06)] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[#64748b] text-sm">
            <span>© 2026 FutureTalent. All rights reserved. • <Link href="/privacy" className="hover:underline hover:text-white">Privacy Policy</Link> • <Link href="/terms" className="hover:underline hover:text-white">Terms of Service</Link> • <Link href="/about" className="hover:underline hover:text-white">About</Link> • <Link href="/contact" className="hover:underline hover:text-white">Contact</Link></span>
            <span>Built with ♥ for remote workers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
