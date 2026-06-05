"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  const [scrolled, setScrolled] = useState(true);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#06060a] text-white selection:bg-[#34d399] selection:text-black">
      {/* Navbar */}
      <nav className="navbar scrolled">
        <div className="navbar-inner">
          <Link href="/" className="nav-logo">
            Future<span>Talent</span>
          </Link>
          <div className="nav-links">
            <Link href="/#categories" className="nav-link">Categories</Link>
            <Link href="/blog" className="nav-link">Blog</Link>
            <Link href="/jobs" className="nav-cta-neon">Browse Jobs</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pt-20 md:pt-28 pb-10 md:pb-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8 md:p-12 mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
              Privacy <span className="gradient-text">Policy</span>
            </h1>
            <p className="text-sm text-[#64748b] mb-10">
              Last Updated: May 25, 2026
            </p>

            <div className="space-y-8 text-[#cbd5e1] leading-relaxed">
              <section>
                <p className="text-lg text-[#94a3b8]">
                  At <strong>FutureTalent</strong>, accessible from <Link href="/" className="text-[#34d399] hover:underline">futuretalent.online</Link>, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by FutureTalent and how we use it.
                </p>
              </section>

              <hr className="border-white/10" />

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">1. Google AdSense & DoubleClick Cookie</h2>
                <p>
                  Google is one of the third-party vendors on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to futuretalent.online and other sites on the internet.
                </p>
                <p>
                  Visitors may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy at the following URL:{" "}
                  <a
                    href="https://policies.google.com/technologies/ads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#34d399] hover:underline break-all"
                  >
                    https://policies.google.com/technologies/ads
                  </a>
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">2. Our Advertising Partners</h2>
                <p>
                  Some of the advertisers on our site may use cookies and web beacons. Our advertising partners include:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Google AdSense:</strong> Their privacy policy can be found at{" "}
                    <a
                      href="https://policies.google.com/technologies/ads"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#34d399] hover:underline break-all"
                    >
                      https://policies.google.com/technologies/ads
                    </a>
                  </li>
                </ul>
                <p>
                  Third-party ad servers or ad networks use technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on FutureTalent, which are sent directly to users' browsers. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.
                </p>
                <p>
                  Note that FutureTalent has no access to or control over these cookies that are used by third-party advertisers.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">3. Log Files</h2>
                <p>
                  FutureTalent follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this as part of hosting services' analytics. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">4. GDPR Data Protection Rights</h2>
                <p>We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>The right to access</strong> – You have the right to request copies of your personal data.</li>
                  <li><strong>The right to rectification</strong> – You have the right to request that we correct any information you believe is inaccurate.</li>
                  <li><strong>The right to erasure</strong> – You have the right to request that we erase your personal data, under certain conditions.</li>
                  <li><strong>The right to restrict processing</strong> – You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
                  <li><strong>The right to object to processing</strong> – You have the right to object to our processing of your personal data, under certain conditions.</li>
                  <li><strong>The right to data portability</strong> – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">5. Children's Information</h2>
                <p>
                  Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.
                </p>
                <p>
                  FutureTalent does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately and we will do our best efforts to promptly remove such information from our records.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white">6. Consent</h2>
                <p>
                  By using our website, you hereby consent to our Privacy Policy and agree to its Terms and Conditions.
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
