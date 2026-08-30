'use client';

import Link from 'next/link';
import { Calendar, UserCheck, FolderSimple, ArrowUpRight } from '@phosphor-icons/react';
import type { UpcomingDeadlineDto } from '../api/dashboard.types';

interface ProjectDeadlinesProps {
  workspaceId: string;
  deadlines: UpcomingDeadlineDto[];
}

export function ProjectDeadlines({ workspaceId, deadlines }: ProjectDeadlinesProps) {
  return (
    <div className="section-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)]">
            <Calendar className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-base text-[var(--color-ink-deep)]">
            Upcoming Deliverables
          </h3>
        </div>

        <Link
          href={`/workspaces/${workspaceId}/projects`}
          className="text-xs font-semibold text-[var(--color-brand-blue)] hover:text-[var(--color-blue-pressed)] hover:underline flex items-center gap-1 transition-colors"
        >
          <span>All projects</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {!deadlines || deadlines.length === 0 ? (
        <div className="text-center py-8 px-4 border-2 border-dashed border-[var(--color-hairline)] rounded-[var(--radius-xl)] space-y-2 bg-[var(--color-surface-soft)]">
          <FolderSimple className="h-8 w-8 text-[var(--color-stone)] mx-auto" />
          <p className="text-xs font-medium text-[var(--color-steel)]">No active project target dates</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {deadlines.map((proj) => (
            <Link
              key={proj.id}
              href={`/workspaces/${workspaceId}/projects`}
              className="deadline-item group"
            >
              <div className="space-y-0.5 min-w-0">
                <h4 className="font-semibold text-sm text-[var(--color-ink-deep)] truncate group-hover:text-[var(--color-brand-blue)] transition-colors">
                  {proj.name}
                </h4>
                <p className="text-xs text-[var(--color-steel)] flex items-center gap-1 truncate">
                  <UserCheck className="h-3.5 w-3.5 text-[var(--color-stone)]" />
                  <span>{proj.clientName}</span>
                </p>
              </div>

              {proj.targetDate && (
                <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] font-semibold text-xs border border-[var(--color-hairline)] flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(proj.targetDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
