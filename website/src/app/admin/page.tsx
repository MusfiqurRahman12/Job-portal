'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploaderWithResizer from '@/components/ImageUploaderWithResizer';

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

  const [activeTab, setActiveTab] = useState<'job' | 'article' | 'scraper' | 'social' | 'settings'>('job');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Scraper State
  const [runs, setRuns] = useState<any[]>([]);
  const [scraperLoading, setScraperLoading] = useState(false);

  // Image Upload States
  const [jobLogo, setJobLogo] = useState('');
  const [articleImage, setArticleImage] = useState('');

  // Social Marketing State
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [socialContent, setSocialContent] = useState('');
  const [socialPlatforms, setSocialPlatforms] = useState<string[]>([]);
  const [socialImage, setSocialImage] = useState('');
  const [socialScheduledAt, setSocialScheduledAt] = useState('');
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialRunning, setSocialRunning] = useState(false);
  const [previewTab, setPreviewTab] = useState<'twitter' | 'linkedin'>('twitter');
  const [expandedLogs, setExpandedLogs] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchSocialPosts = async () => {
    try {
      const res = await fetch('/api/admin/social');
      const data = await res.json();
      if (res.ok && data.posts) {
        setSocialPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to fetch social posts', err);
    }
  };

  const handleConnectPlatform = async (platform: string) => {
    try {
      setMessage(`Connecting ${platform}...`);
      const res = await fetch('/api/admin/social/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, '_blank');
        setMessage(`Successfully generated connection URL for ${platform}! Please complete authorization in the new tab.`);
      } else {
        setMessage(`Connection error: ${data.error || 'Failed to connect'}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleSocialImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('Uploading media...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/social/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setSocialImage(data.url);
        setMessage('Media uploaded successfully!');
      } else {
        setMessage(`Upload error: ${data.error || 'Failed to upload'}`);
      }
    } catch (err: any) {
      setMessage(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSocialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (socialPlatforms.length === 0) {
      setMessage('Error: Please select at least one social platform.');
      return;
    }
    setSocialLoading(true);
    setMessage('');

    const payload = {
      content: socialContent,
      image_url: socialImage,
      platforms: socialPlatforms,
      scheduled_at: socialScheduledAt || new Date().toISOString(),
      status: 'scheduled',
    };

    try {
      const res = await fetch('/api/admin/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage('Success! Social post scheduled.');
        setSocialContent('');
        setSocialImage('');
        setSocialPlatforms([]);
        setSocialScheduledAt('');
        fetchSocialPosts();
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSocialLoading(false);
    }
  };

  const handleTriggerSocialQueue = async () => {
    setSocialRunning(true);
    setMessage('Running social posting runner...');
    try {
      const res = await fetch('/api/admin/social/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Social queue executed. Processed posts count: ${data.processed}`);
        fetchSocialPosts();
      } else {
        setMessage(`Error running scheduler: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSocialRunning(false);
    }
  };

  const handleTriggerSinglePost = async (id: number) => {
    setMessage(`Publishing post immediately...`);
    try {
      const res = await fetch('/api/admin/social/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Post published successfully!');
        fetchSocialPosts();
      } else {
        setMessage(`Error publishing post: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDeleteSocialPost = async (id: number) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return;
    try {
      const res = await fetch(`/api/admin/social?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage('Successfully deleted scheduled post.');
        fetchSocialPosts();
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error || 'Failed to delete'}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const getCharLimitWarning = () => {
    if (socialPlatforms.includes('twitter') && socialContent.length > 280) {
      return `⚠️ X / Twitter character limit exceeded (${socialContent.length}/280)`;
    }
    return '';
  };

  // Settings State
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [enableJobScraping, setEnableJobScraping] = useState(true);
  const [enableArticleScraping, setEnableArticleScraping] = useState(true);
  const [articleAuthor, setArticleAuthor] = useState('FutureTalent');
  const [articleSeoFormat, setArticleSeoFormat] = useState(true);

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
    const payload = {
      ...data,
      logo: jobLogo
    };

    try {
      const res = await fetch('/api/admin/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage(`Success! Job posted with slug: ${result.slug}`);
        (e.target as HTMLFormElement).reset();
        setJobLogo('');
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
    const payload = {
      ...data,
      image: articleImage
    };

    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage(`Success! Article posted with slug: ${result.slug}`);
        (e.target as HTMLFormElement).reset();
        setArticleImage('');
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
    if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab]);

  // Fetch social posts automatically when the social tab is selected
  useEffect(() => {
    if (activeTab === 'social') {
      fetchSocialPosts();
    }
  }, [activeTab]);

  // Settings API
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        setEnableJobScraping(s.enable_job_scraping?.value !== 'false');
        setEnableArticleScraping(s.enable_article_scraping?.value !== 'false');
        setArticleAuthor(s.article_author?.value || 'FutureTalent');
        setArticleSeoFormat(s.article_seo_format?.value !== 'false');
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            enable_job_scraping: enableJobScraping ? 'true' : 'false',
            enable_article_scraping: enableArticleScraping ? 'true' : 'false',
            article_author: articleAuthor.trim() || 'FutureTalent',
            article_seo_format: articleSeoFormat ? 'true' : 'false',
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Settings saved successfully! Changes take effect on the next scraper run.');
      } else {
        setMessage(`Error: ${data.error || data.errors?.join(', ') || 'Failed to save settings'}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSettingsSaving(false);
    }
  };

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
          <button
            onClick={() => setActiveTab('social')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'social' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Social Marketing
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            ⚙️ Settings
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
                <ImageUploaderWithResizer
                  label="Company Logo"
                  aspectRatio={1}
                  maxWidth={200}
                  maxHeight={200}
                  onImageCropped={(base64) => setJobLogo(base64)}
                  initialImageUrl={jobLogo}
                />
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
                <ImageUploaderWithResizer
                  label="Hero Image"
                  aspectRatio={16 / 9}
                  maxWidth={1200}
                  maxHeight={675}
                  onImageCropped={(base64) => setArticleImage(base64)}
                  initialImageUrl={articleImage}
                />
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
                          <a href={run.html_url} target="_blank" rel="noopener noreferrer" className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-emerald-400 text-sm font-medium transition-colors whitespace-nowrap">
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

          {activeTab === 'social' && (
            <div className="space-y-8 animate-fade-in text-left">
              {/* Account Connection Hub */}
              <div className="bg-[#14141d]/50 border border-gray-800 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-lg font-bold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">
                  Connect Social Channels
                </h3>
                <p className="text-xs text-gray-400 mb-4">Link your channels via secure hosted OAuth handles to publish immediately.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 relative z-10">
                  {[
                    { key: 'twitter', label: 'X / Twitter', color: 'bg-black border border-zinc-800 text-white hover:bg-neutral-900' },
                    { key: 'linkedin', label: 'LinkedIn', color: 'bg-[#0077b5] text-white hover:bg-[#006396]' },
                    { key: 'instagram', label: 'Instagram', color: 'bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90' },
                    { key: 'tiktok', label: 'TikTok', color: 'bg-black border border-zinc-800 text-[#00f2fe] hover:opacity-95' },
                    { key: 'threads', label: 'Threads', color: 'bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-850' },
                    { key: 'reddit', label: 'Reddit', color: 'bg-[#ff4500] text-white hover:bg-[#e03d00]' },
                    { key: 'pinterest', label: 'Pinterest', color: 'bg-[#bd081c] text-white hover:bg-[#a30718]' },
                    { key: 'truthsocial', label: 'Truth Social', color: 'bg-[#be1e2d] text-white hover:bg-[#a61925]' }
                  ].map((chan) => (
                    <button
                      key={chan.key}
                      type="button"
                      onClick={() => handleConnectPlatform(chan.key)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg shadow transition-all active:scale-[0.98] cursor-pointer ${chan.color}`}
                    >
                      Connect {chan.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Composer & Preview Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Form Composer */}
                <div className="lg:col-span-7 space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-teal-400 rounded-full"></span>
                    Campaign Post Composer
                  </h3>

                  <form onSubmit={handleSocialSubmit} className="space-y-6">
                    {/* Platform Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2.5">
                        Target Platforms (Broadcast everywhere)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'twitter', label: 'X / Twitter', activeClass: 'bg-neutral-800 border-white text-white', inactiveClass: 'bg-[#14141d] border-gray-800 text-gray-400 hover:border-gray-700' },
                          { id: 'linkedin', label: 'LinkedIn', activeClass: 'bg-[#0077b5]/20 border-[#0077b5] text-[#0077b5] font-bold', inactiveClass: 'bg-[#14141d] border-gray-800 text-gray-400 hover:border-gray-700' },
                          { id: 'instagram', label: 'Instagram', activeClass: 'bg-[#e1306c]/20 border-[#e1306c] text-[#e1306c] font-bold', inactiveClass: 'bg-[#14141d] border-gray-800 text-gray-400 hover:border-gray-700' },
                          { id: 'tiktok', label: 'TikTok', activeClass: 'bg-[#ff0050]/20 border-[#ff0050] text-[#ff0050] font-bold', inactiveClass: 'bg-[#14141d] border-gray-800 text-gray-400 hover:border-gray-700' },
                          { id: 'threads', label: 'Threads', activeClass: 'bg-neutral-100 text-black border-neutral-100 font-bold', inactiveClass: 'bg-[#14141d] border-gray-800 text-gray-400 hover:border-gray-700' },
                          { id: 'reddit', label: 'Reddit', activeClass: 'bg-[#ff4500]/20 border-[#ff4500] text-[#ff4500] font-bold', inactiveClass: 'bg-[#14141d] border-gray-800 text-gray-400 hover:border-gray-700' },
                          { id: 'pinterest', label: 'Pinterest', activeClass: 'bg-[#bd081c]/20 border-[#bd081c] text-[#bd081c] font-bold', inactiveClass: 'bg-[#14141d] border-gray-800 text-gray-400 hover:border-gray-700' },
                          { id: 'truthsocial', label: 'Truth Social', activeClass: 'bg-[#be1e2d]/20 border-[#be1e2d] text-[#be1e2d] font-bold', inactiveClass: 'bg-[#14141d] border-gray-800 text-gray-400 hover:border-gray-700' }
                        ].map((plat) => {
                          const isActive = socialPlatforms.includes(plat.id);
                          return (
                            <button
                              key={plat.id}
                              type="button"
                              onClick={() => {
                                if (isActive) {
                                  setSocialPlatforms(socialPlatforms.filter((p) => p !== plat.id));
                                } else {
                                  setSocialPlatforms([...socialPlatforms, plat.id]);
                                }
                              }}
                              className={`px-3.5 py-1.5 rounded-full border text-xs transition-all active:scale-[0.96] cursor-pointer ${isActive ? plat.activeClass : plat.inactiveClass}`}
                            >
                              {plat.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Content Input */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-sm font-medium text-gray-400">Post Copy</label>
                        <span className="text-xs text-gray-500">{socialContent.length} chars</span>
                      </div>
                      <textarea
                        required
                        value={socialContent}
                        onChange={(e) => setSocialContent(e.target.value)}
                        rows={5}
                        className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm focus:ring-1 focus:ring-teal-500"
                        placeholder="Write your campaign message here..."
                      ></textarea>
                      {getCharLimitWarning() && (
                        <p className="text-amber-400 text-xs mt-1">{getCharLimitWarning()}</p>
                      )}
                    </div>

                    {/* Media Image Attachment */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">
                        Attachment Image (Optional)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* URL input */}
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">Paste Image URL</span>
                          <input
                            type="url"
                            value={socialImage}
                            onChange={(e) => setSocialImage(e.target.value)}
                            className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs focus:ring-1 focus:ring-teal-500"
                            placeholder="https://images.unsplash.com/photo-..."
                          />
                        </div>
                        {/* File upload picker */}
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">Or Upload Image File</span>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSocialImageUpload}
                              disabled={uploading}
                              className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-xs focus:ring-1 focus:ring-teal-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-950 file:text-teal-400 hover:file:bg-teal-900 file:cursor-pointer disabled:opacity-50"
                            />
                            {uploading && (
                              <div className="absolute right-3 top-2 flex items-center gap-1.5 text-teal-400 text-xs font-semibold">
                                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-ping"></span>
                                Uploading...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {socialImage && (
                        <div className="mt-2 flex items-center gap-2 bg-[#14141d]/30 border border-gray-800 rounded-lg p-2">
                          <img src={socialImage} alt="Preview" className="w-12 h-12 object-cover rounded border border-zinc-800" />
                          <div className="flex-1 min-w-0">
                            <span className="block text-[10px] text-gray-500 uppercase font-bold">Selected Image</span>
                            <span className="block text-xs text-teal-400 truncate font-mono">{socialImage}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSocialImage('')}
                            className="text-xs text-red-400 hover:text-red-300 font-semibold px-2"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Date scheduling */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Schedule Publication Time (Optional)</label>
                      <input
                        type="datetime-local"
                        value={socialScheduledAt}
                        onChange={(e) => setSocialScheduledAt(e.target.value)}
                        className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm focus:ring-1 focus:ring-teal-500"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Leave empty to deploy post immediately (Publish Now).</p>
                    </div>

                    <button
                      disabled={socialLoading}
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-teal-600/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      {socialLoading ? 'Composing Campaign...' : socialScheduledAt ? 'Schedule Marketing Campaign' : 'Publish Marketing Campaign Now'}
                    </button>
                  </form>
                </div>

                {/* Right Column: Live Previews */}
                <div className="lg:col-span-5 space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Live Post Preview</h3>
                  <div className="border border-gray-800 bg-[#06060a] rounded-xl overflow-hidden shadow-2xl">
                    <div className="flex bg-[#0f0f15] border-b border-gray-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('twitter')}
                        className={`flex-1 py-3 font-semibold transition-colors border-b-2 ${previewTab === 'twitter' ? 'border-teal-500 text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                      >
                        X / Twitter Feed
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('linkedin')}
                        className={`flex-1 py-3 font-semibold transition-colors border-b-2 ${previewTab === 'linkedin' ? 'border-teal-500 text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                      >
                        LinkedIn Feed
                      </button>
                    </div>

                    <div className="p-6">
                      {previewTab === 'twitter' ? (
                        /* Twitter Mockup */
                        <div className="flex gap-3 text-[14px] leading-snug">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center font-bold text-black text-sm flex-shrink-0">
                            FT
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white">FutureTalent</span>
                              <span className="text-gray-500">@FutureTalent_HQ</span>
                              <span className="text-gray-500">· 1s</span>
                            </div>
                            <p className="text-white mt-1 whitespace-pre-line break-words">
                              {socialContent || 'Your campaign message copy goes here. Toggle checklist platforms and write above to preview.'}
                            </p>
                            {socialImage && (
                              <div className="mt-3 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                                <img src={socialImage} alt="Attachment Preview" className="w-full h-48 object-cover" />
                              </div>
                            )}
                            {/* Retweet/Like icons */}
                            <div className="flex justify-between max-w-md text-gray-500 text-xs mt-4">
                              <span className="flex items-center gap-1">💬 0</span>
                              <span className="flex items-center gap-1">🔁 0</span>
                              <span className="flex items-center gap-1">❤️ 0</span>
                              <span className="flex items-center gap-1">📊 0</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* LinkedIn Mockup */
                        <div className="text-[14px]">
                          <div className="flex gap-2.5 mb-3">
                            <div className="w-12 h-12 rounded bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center font-bold text-black text-lg flex-shrink-0">
                              FT
                            </div>
                            <div>
                              <div className="font-bold text-white hover:text-blue-400 hover:underline cursor-pointer">FutureTalent Portal</div>
                              <div className="text-[11px] text-gray-500">22,048 followers</div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-1">1h · 🌐</div>
                            </div>
                          </div>
                          <p className="text-white whitespace-pre-line break-words mb-3 leading-relaxed">
                            {socialContent || 'Your campaign message copy goes here. Toggle checklist platforms and write above to preview.'}
                          </p>
                          {socialImage ? (
                            <div className="border border-zinc-800 rounded overflow-hidden bg-zinc-950">
                              <img src={socialImage} alt="Attachment Preview" className="w-full h-56 object-cover" />
                              <div className="p-3 bg-zinc-900 border-t border-zinc-800">
                                <div className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">FutureTalent.online</div>
                                <div className="text-xs text-white font-semibold mt-0.5">Elevate your remote talent recruitment</div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-px bg-zinc-800 my-2" />
                          )}
                          {/* LinkedIn engagement icons */}
                          <div className="flex justify-between border-t border-zinc-900 pt-3 text-gray-500 text-xs mt-3">
                            <span className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 py-1 px-2 rounded">👍 Like</span>
                            <span className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 py-1 px-2 rounded">💬 Comment</span>
                            <span className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 py-1 px-2 rounded">🔁 Repost</span>
                            <span className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 py-1 px-2 rounded">📤 Send</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status / History List */}
              <div className="border-t border-gray-800 pt-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-pulse"></span>
                      Campaign Queue & Execution Audits
                    </h3>
                    <p className="text-xs text-gray-400">Monitor scheduler status, trigger execution sweeps, and view Zernio API logs.</p>
                  </div>
                  <button
                    onClick={handleTriggerSocialQueue}
                    disabled={socialRunning}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 px-6 rounded-lg text-sm shadow transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {socialRunning ? 'Sweeping Social Queue...' : 'Sweep Scheduled Queue Now'}
                  </button>
                </div>

                {socialPosts.length === 0 ? (
                  <div className="text-center py-10 bg-[#14141d]/30 border border-gray-800 rounded-xl">
                    <p className="text-gray-500 italic text-sm">No campaigns scheduled or logs found. Start composing above!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {socialPosts.map((post) => (
                      <div key={post.id} className="bg-[#14141d]/70 border border-gray-800/80 rounded-xl p-5 shadow transition-all hover:border-gray-700/60 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md ${
                              post.status === 'posted' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/30' :
                              post.status === 'failed' ? 'bg-red-950/60 text-red-400 border border-red-800/30' :
                              post.status === 'scheduled' ? 'bg-blue-950/60 text-blue-400 border border-blue-800/30' :
                              'bg-neutral-850 text-gray-400 border border-zinc-700'
                            }`}>
                              {post.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              Scheduled: {new Date(post.scheduled_at).toLocaleString()}
                            </span>
                            {post.posted_at && (
                              <span className="text-xs text-emerald-500">
                                · Posted: {new Date(post.posted_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {post.status === 'scheduled' && (
                              <button
                                onClick={() => handleTriggerSinglePost(post.id)}
                                className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-semibold transition-all cursor-pointer"
                              >
                                Post Now
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSocialPost(post.id)}
                              className="px-2.5 py-1.5 bg-red-950/45 hover:bg-red-900/50 border border-red-800/40 text-red-200 rounded text-xs font-semibold transition-all cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-white text-sm whitespace-pre-line break-words leading-relaxed bg-black/20 p-3 rounded-lg border border-zinc-800/50">
                            {post.content}
                          </p>
                          {post.image_url && (
                            <a href={post.image_url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-400 hover:underline mt-2 inline-block">
                              🔗 Image Attachment: {post.image_url.substring(0, 60)}...
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-xs text-gray-500 mr-1 font-semibold">Targets:</span>
                          {post.platforms.map((plat: string) => (
                            <span key={plat} className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-900 text-zinc-300 border border-zinc-800">
                              {plat}
                            </span>
                          ))}
                        </div>

                        {/* Logs section */}
                        {post.logs && (
                          <div className="border-t border-zinc-800/60 pt-3">
                            <button
                              type="button"
                              onClick={() => setExpandedLogs(expandedLogs === post.id ? null : post.id)}
                              className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <span>{expandedLogs === post.id ? '▼ Hide Connection Logs' : '► View Connection Logs'}</span>
                            </button>
                            
                            {expandedLogs === post.id && (
                              <pre className="mt-3 p-4 bg-zinc-950 border border-zinc-900 rounded-lg text-[10px] text-zinc-400 font-mono overflow-x-auto whitespace-pre leading-relaxed shadow-inner max-h-60 overflow-y-auto animate-fade-in">
                                {post.logs}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold">Scraper Settings</h2>
                <p className="text-sm text-gray-400 mt-1">Control what the auto scraper does on each run. Changes take effect on the next scheduled or manual run.</p>
              </div>

              {settingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-400">Loading settings...</span>
                </div>
              ) : (
                <>
                  {/* Toggle: Enable Job Scraping */}
                  <div className="bg-[#1a1a24] border border-gray-700 rounded-lg p-5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Job Scraping</p>
                      <p className="text-sm text-gray-400 mt-0.5">Automatically scrape and AI-rewrite job listings from remote job boards.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableJobScraping(!enableJobScraping)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                        enableJobScraping ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                        enableJobScraping ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Toggle: Enable Article Scraping */}
                  <div className="bg-[#1a1a24] border border-gray-700 rounded-lg p-5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Article Scraping & Generation</p>
                      <p className="text-sm text-gray-400 mt-0.5">Scrape RSS feeds, AI-rewrite articles, and generate original blog posts.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableArticleScraping(!enableArticleScraping)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                        enableArticleScraping ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                        enableArticleScraping ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Toggle: SEO Format Enforcement */}
                  <div className="bg-[#1a1a24] border border-gray-700 rounded-lg p-5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">SEO Heading Format</p>
                      <p className="text-sm text-gray-400 mt-0.5">Force AI-rewritten articles to use structured H1, H2, H3 headings for better Google ranking.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setArticleSeoFormat(!articleSeoFormat)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                        articleSeoFormat ? 'bg-emerald-600' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                        articleSeoFormat ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Text Input: Article Author Name */}
                  <div className="bg-[#1a1a24] border border-gray-700 rounded-lg p-5">
                    <label className="block font-medium text-white mb-1">Article Author Name</label>
                    <p className="text-sm text-gray-400 mb-3">The author name that appears on all AI-generated and scraped articles.</p>
                    <input
                      type="text"
                      value={articleAuthor}
                      onChange={(e) => setArticleAuthor(e.target.value)}
                      className="w-full max-w-md bg-[#0f0f15] border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-200"
                      placeholder="FutureTalent"
                    />
                  </div>

                  {/* Status summary */}
                  <div className="bg-[#12121a] border border-gray-800 rounded-lg p-4 mt-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Current Configuration Preview</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`px-2.5 py-1 rounded-md border font-medium ${
                        enableJobScraping ? 'bg-blue-950/40 text-blue-400 border-blue-800/30' : 'bg-gray-800 text-gray-500 border-gray-700'
                      }`}>
                        Jobs: {enableJobScraping ? 'ON' : 'OFF'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-md border font-medium ${
                        enableArticleScraping ? 'bg-purple-950/40 text-purple-400 border-purple-800/30' : 'bg-gray-800 text-gray-500 border-gray-700'
                      }`}>
                        Articles: {enableArticleScraping ? 'ON' : 'OFF'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-md border font-medium ${
                        articleSeoFormat ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30' : 'bg-gray-800 text-gray-500 border-gray-700'
                      }`}>
                        SEO: {articleSeoFormat ? 'ON' : 'OFF'}
                      </span>
                      <span className="px-2.5 py-1 rounded-md border bg-amber-950/40 text-amber-400 border-amber-800/30 font-medium">
                        Author: {articleAuthor || 'FutureTalent'}
                      </span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={saveSettings}
                    disabled={settingsSaving}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-amber-500/20 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {settingsSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
