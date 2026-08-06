'use client';

/**
 * Individual workspace card
 * Displays workspace info: name, description, slug, created date
 */

import { Card } from '@shared/components';
import { Calendar, Copy, Edit2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkspaceResponse } from '../api';
import { useDeleteWorkspace } from '../hooks';

interface WorkspaceCardProps {
  workspace: WorkspaceResponse;
  onEdit?: (workspace: WorkspaceResponse) => void;
}

export function WorkspaceCard({ workspace, onEdit }: WorkspaceCardProps) {
  const { mutate: deleteWorkspace, isPending: isDeleting } = useDeleteWorkspace();

  const createdDate = new Date(workspace.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleCopySlug = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard
      .writeText(workspace.slug)
      .then(() => toast.success('Slug copied'))
      .catch(() => toast.error('Failed to copy slug'));
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${workspace.name}?`)) {
      deleteWorkspace(workspace.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(workspace);
  };

  const handleInvite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info('Invite feature coming soon!');
  };

  // Derive a single initial from the workspace name
  const initials = workspace.name.slice(0, 2).toUpperCase();

  return (
    <Card
      className={[
        'group cursor-pointer transition-shadow duration-150 relative overflow-hidden',
        'hover:shadow-[var(--shadow-mockup)]',
        'hover:border-[var(--color-brand-blue)]/30',
        isDeleting ? 'opacity-50 pointer-events-none' : '',
      ].join(' ')}
    >
      {/* Quick Action Overlay (appears on hover) */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <button
          onClick={handleInvite}
          className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-canvas)] text-[var(--color-steel)] hover:text-[var(--color-brand-blue)] hover:bg-[var(--color-surface-soft)] shadow-sm border border-[var(--color-hairline-soft)] transition-colors"
          title="Invite Users"
        >
          <UserPlus size={14} />
        </button>
        <button
          onClick={handleEdit}
          className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-canvas)] text-[var(--color-steel)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] shadow-sm border border-[var(--color-hairline-soft)] transition-colors"
          title="Edit Workspace"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-canvas)] text-[var(--color-steel)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] shadow-sm border border-[var(--color-hairline-soft)] transition-colors"
          title="Delete Workspace"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-4 relative z-0">
        {/* Avatar + name */}
        <div className="flex items-start gap-3 pr-24">
          <div
            className="flex-shrink-0 h-10 w-10 rounded-[var(--radius-lg)] flex items-center justify-center text-sm font-semibold"
            style={{
              background: 'var(--color-surface-pricing-featured)',
              color: 'var(--color-brand-blue)',
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="text-base font-medium leading-snug truncate transition-colors duration-150 group-hover:text-[var(--color-brand-blue)]"
              style={{ color: 'var(--color-ink-deep)' }}
            >
              {workspace.name}
            </h3>
            {workspace.description && (
              <p
                className="mt-0.5 text-sm line-clamp-2"
                style={{ color: 'var(--color-slate-text)' }}
              >
                {workspace.description}
              </p>
            )}
          </div>
        </div>

        {/* Slug chip */}
        <div
          className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)' }}
        >
          <code className="text-xs font-mono" style={{ color: 'var(--color-charcoal)' }}>
            {workspace.slug}
          </code>
          <button
            onClick={handleCopySlug}
            className="ml-2 p-1 rounded-[var(--radius-sm)] transition-colors duration-150 hover:bg-[var(--color-hairline)]"
            title="Copy slug"
            aria-label="Copy slug"
          >
            <Copy size={13} style={{ color: 'var(--color-steel)' }} />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-hairline-soft)]">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} style={{ color: 'var(--color-steel)' }} />
            <span className="text-xs" style={{ color: 'var(--color-steel)' }}>
              {createdDate}
            </span>
          </div>

          {/* Owner pill */}
          <span
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'var(--color-surface-yellow)',
              color: 'var(--color-yellow-dark)',
            }}
          >
            Owner
          </span>
        </div>
      </div>
    </Card>
  );
}
