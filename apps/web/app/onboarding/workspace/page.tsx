'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@api/client';


export default function WorkspaceOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const workspace = await apiPost<{ id: string }>('/workspaces', {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      });
      router.push(`/workspaces/${workspace.id}/clients`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to create workspace'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-canvas,#f8fafc)] p-4 sm:p-8">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-[var(--color-hairline,#e2e8f0)] space-y-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Step 1 of 1
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            Create your workspace
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Set up your studio or freelance business workspace to get started.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="workspace-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Workspace Name
            </label>
            <input
              id="workspace-name"
              type="text"
              required
              placeholder="e.g. Acme Design Studio"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm outline-none transition"
            />
          </div>

          <div>
            <label
              htmlFor="workspace-slug"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Workspace Slug
            </label>
            <input
              id="workspace-slug"
              type="text"
              required
              placeholder="acme-design-studio"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm outline-none transition bg-gray-50 text-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-sm"
          >
            {isSubmitting ? 'Creating Workspace...' : 'Create Workspace & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
