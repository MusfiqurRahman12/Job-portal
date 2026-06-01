'use client';

import { useState } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'job' | 'article'>('job');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06060a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          FutureTalent Admin Dashboard
        </h1>

        <div className="flex space-x-4 mb-8 border-b border-gray-800 pb-2">
          <button
            onClick={() => setActiveTab('job')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
              activeTab === 'job' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Post a Job
          </button>
          <button
            onClick={() => setActiveTab('article')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
              activeTab === 'article' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Post an Article
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
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Product">Product</option>
                    <option value="Sales">Sales</option>
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
        </div>
      </div>
    </div>
  );
}
