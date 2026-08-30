'use client';

/**
 * Individual workspace card
 * Displays workspace info: name, description, slug, created date
 */

import { Card } from '@shared/components';
import { Calendar, Copy, PencilSimple, Trash, UserPlus } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { WorkspaceResponse } from '../api';
import { useDeleteWorkspace } from '../hooks';

interface WorkspaceCardProps {
  workspace: WorkspaceResponse;
  onEdit?: (workspace: WorkspaceResponse) => void;
}

export function WorkspaceCard({ workspace, onEdit }: WorkspaceCardProps) {
  const router = useRouter();
  const { mutate: deleteWorkspace, isPending: isDeleting } = useDeleteWorkspace();

  const handleCardClick = () => {
    router.push(`/workspaces/${workspace.id}/dashboard`);
  };

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
      onClick={handleCardClick}
      className={[
        'group cursor-pointer transition-all duration-200 relative overflow-hidden',
        'p-6 rounded-[var(--radius-xl)] bg-white border border-[var(--color-hairline-soft)] border-t-[3px] border-t-[var(--color-brand-blue)]',
        'hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1',
        isDeleting ? 'opacity-50 pointer-events-none' : '',
      ].join(' ')}
    >
      {/* Quick Action Overlay (appears on hover) */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <button
          onClick={handleInvite}
          className="p-1.5 rounded-full bg-[var(--color-canvas)] text-[var(--color-steel)] hover:text-[var(--color-brand-blue)] hover:bg-[var(--color-surface-soft)] shadow-xs border border-[var(--color-hairline-soft)] transition-all active:scale-95"
          title="Invite Users"
        >
          <UserPlus size={14} />
        </button>
        <button
          onClick={handleEdit}
          className="p-1.5 rounded-full bg-[var(--color-canvas)] text-[var(--color-steel)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] shadow-xs border border-[var(--color-hairline-soft)] transition-all active:scale-95"
          title="Edit Workspace"
        >
          <PencilSimple size={14} />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-full bg-[var(--color-canvas)] text-[var(--color-steel)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] shadow-xs border border-[var(--color-hairline-soft)] transition-all active:scale-95"
          title="Delete Workspace"
        >
          <Trash size={14} />
        </button>
      </div>

      <div className="space-y-4 relative z-0">
        {/* Avatar + name */}
        <div className="flex items-start gap-3 pr-24">
          <div
            className="flex-shrink-0 h-10 w-10 rounded-[var(--radius-lg)] flex items-center justify-center text-sm font-bold shadow-xs"
            style={{
              background: 'var(--color-surface-pricing-featured)',
              color: 'var(--color-brand-blue)',
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="text-base font-bold leading-snug truncate transition-colors duration-150 group-hover:text-[var(--color-brand-blue)]"
              style={{ color: 'var(--color-ink-deep)' }}
            >
              {workspace.name}
            </h3>
            {workspace.description && (
              <p
                className="mt-0.5 text-xs line-clamp-2"
                style={{ color: 'var(--color-slate-text)' }}
              >
                {workspace.description}
              </p>
            )}
          </div>
        </div>

        {/* Slug chip */}
        <div
          className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-1.5 border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)]"
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
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-[var(--color-brand-yellow)]/40"
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
