'use client';

import { useState, useRef, useEffect } from 'react';
import type { ProjectStatus } from '../api';
import { useUpdateProjectStatus } from '../hooks';

interface ProjectStatusControlProps {
  workspaceId: string;
  projectId: string;
  currentStatus: ProjectStatus;
  onStatusChange?: (status: ProjectStatus) => void;
}

export function ProjectStatusControl({
  workspaceId,
  projectId,
  currentStatus,
  onStatusChange,
}: ProjectStatusControlProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { mutate: updateStatus, isPending } = useUpdateProjectStatus(workspaceId, projectId);

  const statusStyles: Record<ProjectStatus, string> = {
    draft: 'bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)] border-[var(--color-brand-yellow)]/40',
    active: 'bg-[var(--color-teal-light)] text-[var(--color-moss-dark)] border-[var(--color-brand-teal)]/30',
    completed: 'bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] border-[var(--color-brand-blue)]/20',
    archived: 'bg-[var(--color-surface-soft)] text-[var(--color-steel)] border-[var(--color-hairline-strong)]',
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = (status: ProjectStatus) => {
    setOpen(false);
    if (status === currentStatus) return;
    updateStatus(status, {
      onSuccess: () => onStatusChange?.(status),
    });
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Project status: ${currentStatus}. Click to change.`}
        className={`px-2.5 py-1 text-xs font-semibold rounded-full border capitalize transition-all flex items-center gap-1 ${
          statusStyles[currentStatus] || statusStyles.draft
        }`}
      >
        <span>{currentStatus}</span>
        <span className="text-[10px]">▼</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select project status"
          className="status-dropdown"
          onClick={(e) => e.stopPropagation()}
        >
          {(['draft', 'active', 'completed', 'archived'] as const).map((st) => (
            <button
              key={st}
              type="button"
              role="option"
              aria-selected={st === currentStatus}
              onClick={() => handleSelect(st)}
              className={`status-dropdown-item ${
                st === currentStatus ? 'status-dropdown-item-selected' : ''
              }`}
            >
              <span>{st}</span>
              {st === currentStatus && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

