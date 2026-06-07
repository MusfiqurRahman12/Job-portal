'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Stats State
  const [stats, setStats] = useState<{
    total_jobs: number;
    active_jobs: number;
    total_articles: number;
    active_articles: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'job' | 'article' | 'scraper'>('job');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Scraper State
  const [runs, setRuns] = useState<any[]>([]);
  const [scraperLoading, setScraperLoading] = useState(false);

  // Authentication & Session Management
  const checkSession = async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setIsAuthenticated(true);
        fetchStats();
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsAuthenticated(true);
        fetchStats();
      } else {
        setLoginError(data.error || 'Failed to authenticate');
      }
    } catch (err: any) {
      setLoginError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsAuthenticated(false);
        router.push('/');
      }
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleJobSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/admin/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage(`Success! Job posted with slug: ${result.slug}`);
        (e.target as HTMLFormElement).reset();
        fetchStats();
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleArticleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage(`Success! Article posted with slug: ${result.slug}`);
        (e.target as HTMLFormElement).reset();
        fetchStats();
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/admin/scraper');
      const data = await res.json();
      if (res.ok && data.runs) {
        setRuns(data.runs);
      }
    } catch (err) {
      console.error('Failed to fetch runs', err);
    }
  };

  const triggerScraper = async () => {
    setScraperLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/scraper', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage('Success! Scraper triggered. It should appear in the runs list shortly.');
        setTimeout(fetchRuns, 5000); // Wait 5s then refresh list
      } else {
        setMessage(`Error: ${data.error || 'Failed to trigger'}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setScraperLoading(false);
    }
  };

  // Fetch runs automatically when the scraper tab is selected
  useEffect(() => {
    if (activeTab === 'scraper') {
      fetchRuns();
    }
  }, [activeTab]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#06060a] text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm animate-pulse font-medium">Verifying administrative access...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#06060a] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0f0f15]/80 backdrop-blur-xl border border-gray-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-8 relative">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
              FutureTalent
            </h1>
            <p className="text-gray-400 text-sm">Sign in to control the job portal dashboard</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6 relative">
            {loginError && (
              <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-lg text-sm text-red-300">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Username</label>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1a1a24] border border-gray-700/60 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1a24] border border-gray-700/60 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loginLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06060a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            FutureTalent Admin Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/45 hover:bg-red-900/50 border border-red-800/40 text-red-200 rounded-lg transition-all duration-200 shadow-md hover:shadow-red-950/20 text-sm font-medium cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Logout
          </button>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0f0f15] border border-gray-800/80 rounded-xl p-5 hover:border-blue-500/30 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-all duration-300"></div>
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Total Jobs Scraped</p>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : stats?.total_jobs ?? 0}
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">Cumulative entry count</p>
          </div>

          <div className="bg-[#0f0f15] border border-gray-800/80 rounded-xl p-5 hover:border-emerald-500/30 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-300"></div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Active Jobs</p>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : stats?.active_jobs ?? 0}
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">Live on portal now</p>
          </div>

          <div className="bg-[#0f0f15] border border-gray-800/80 rounded-xl p-5 hover:border-purple-500/30 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-all duration-300"></div>
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">Total Articles</p>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : stats?.total_articles ?? 0}
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">Cumulative articles posted</p>
          </div>

          <div className="bg-[#0f0f15] border border-gray-800/80 rounded-xl p-5 hover:border-pink-500/30 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-pink-500/10 transition-all duration-300"></div>
            <p className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-1">Active Articles</p>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {statsLoading ? '...' : stats?.active_articles ?? 0}
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">Live on news feed now</p>
          </div>
        </div>

        <div className="flex space-x-4 mb-8 border-b border-gray-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('job')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'job' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Post a Job
          </button>
          <button
            onClick={() => setActiveTab('article')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'article' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Post an Article
          </button>
          <button
            onClick={() => setActiveTab('scraper')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'scraper' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Auto Scraper
          </button>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-lg bg-gray-800 border border-gray-700">
            <p className={message.startsWith('Error') ? 'text-red-400' : 'text-green-400'}>
              {message}
            </p>
          </div>
        )}

        <div className="bg-[#0f0f15] border border-gray-800 rounded-xl p-6 shadow-xl">
          {activeTab === 'job' && (
            <form onSubmit={handleJobSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Job Title</label>
                  <input required name="title" type="text" className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Senior Frontend Engineer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Company</label>
                  <input required name="company" type="text" className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Acme Corp" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                  <input required name="location" type="text" className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Remote (US)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Salary / Compensation</label>
                  <input name="salary" type="text" className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. $120k - $150k" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                  <select name="category" className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="Frontend Development">Frontend Development</option>
                    <option value="Backend Development">Backend Development</option>
                    <option value="Fullstack Development">Fullstack Development</option>
                    <option value="Cloud & DevOps">Cloud & DevOps</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="AI & Machine Learning">AI & Machine Learning</option>
                    <option value="Web3 & Blockchain">Web3 & Blockchain</option>
                    <option value="Mobile Development">Mobile Development</option>
                    <option value="Data Science & Analytics">Data Science & Analytics</option>
                    <option value="Data Engineering">Data Engineering</option>
                    <option value="QA & Testing">QA & Testing</option>
                    <option value="Product Management">Product Management</option>
                    <option value="Design & Creative">Design & Creative</option>
                    <option value="Marketing & Sales">Marketing & Sales</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Writing & Content">Writing & Content</option>
                    <option value="HR & Operations">HR & Operations</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Job Type</label>
                  <select name="type" className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="Full-time">Full-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Application URL</label>
                <input required name="url" type="url" className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="https://..." />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Tags (comma separated)</label>
                <input name="tags" type="text" className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="React, TypeScript, Node.js" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Job Description (Markdown formatting supported)</label>
                <textarea required name="description" rows={8} className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-sm" placeholder="## About the role..."></textarea>
              </div>

              <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50">
                {loading ? 'Posting Job...' : 'Post Job to Live Site'}
              </button>
            </form>
          )}

          {activeTab === 'article' && (
            <form onSubmit={handleArticleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Article Title</label>
                  <input required name="title" type="text" className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" placeholder="e.g. The Future of Remote Work" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                  <select name="category" className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500">
                    <option value="Remote Work">Remote Work</option>
                    <option value="Tech">Tech</option>
                    <option value="Career">Career</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Future of Work">Future of Work</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Hero Image URL</label>
                <input name="image" type="url" className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" placeholder="https://images.unsplash.com/..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Excerpt (Short summary)</label>
                <textarea required name="excerpt" rows={2} className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" placeholder="A brief 1-2 sentence hook..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Article Content (Markdown format)</label>
                <textarea required name="content" rows={12} className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 font-mono text-sm" placeholder="# Introduction..."></textarea>
              </div>

              <button disabled={loading} type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50">
                {loading ? 'Posting Article...' : 'Post Article to Live Site'}
              </button>
            </form>
          )}

          {activeTab === 'scraper' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold">Auto Scraper Controls</h2>
                  <p className="text-sm text-gray-400">View and manually trigger your GitHub Actions crawler.</p>
                </div>
                <button 
                  onClick={triggerScraper}
                  disabled={scraperLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                  {scraperLoading ? 'Triggering...' : 'Trigger Auto Scraper Now'}
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-300">Recent Runs</h3>
                  <button onClick={fetchRuns} className="text-sm text-blue-400 hover:underline">Refresh Status</button>
                </div>
                
                {runs.length === 0 ? (
                  <div className="text-center py-8 bg-[#1a1a24] rounded-lg border border-gray-700">
                    <p className="text-gray-500 italic">No recent runs found, or click refresh to load.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {runs.map((run: any) => (
                      <div key={run.id} className="bg-[#1a1a24] border border-gray-700 rounded-lg p-5 flex flex-col md:flex-row justify-between md:items-center gap-3">
                        <div>
                          <p className="font-medium text-[1.05rem] mb-1">
                            {run.name} <span className="text-gray-500 text-sm ml-2">#{run.run_number}</span>
                          </p>
                          <p className="text-sm text-gray-400 flex items-center gap-3">
                            <span className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${run.status === 'in_progress' || run.status === 'queued' ? 'bg-yellow-400 animate-pulse' : run.conclusion === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                              Status: {run.status}
                            </span>
                            <span>•</span>
                            <span>Result: {run.conclusion || 'Pending'}</span>
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="bg-blue-950/40 text-blue-400 px-2.5 py-1 rounded-md border border-blue-800/30 font-semibold flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Jobs: {run.jobs_added ?? 0} posted
                            </span>
                            <span className="bg-purple-950/40 text-purple-400 px-2.5 py-1 rounded-md border border-purple-800/30 font-semibold flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2m2 2v1a2 2 0 01-2 2h-2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Articles: {run.articles_added ?? 0} posted
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 border-t border-gray-800 pt-3 md:border-0 md:pt-0 mt-1 md:mt-0">
                          <div className="text-xs text-gray-500 text-right">
                            Started:<br/>{new Date(run.created_at).toLocaleString()}
                          </div>
                          <a href={run.html_url} target="_blank" rel="noreferrer" className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-emerald-400 text-sm font-medium transition-colors whitespace-nowrap">
                            View Log ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
