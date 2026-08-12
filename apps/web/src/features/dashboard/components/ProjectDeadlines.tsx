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
    <div className="p-6 rounded-2xl border border-[var(--color-hairline,#e2e8f0)] bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Calendar className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-base text-[var(--color-ink-deep,#0f172a)]">
            Upcoming Deliverables
          </h3>
        </div>

        <Link
          href={`/workspaces/${workspaceId}/projects`}
          className="text-xs font-semibold text-amber-600 hover:underline flex items-center gap-1"
        >
          <span>All projects</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {!deadlines || deadlines.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
          <FolderSimple className="h-8 w-8 text-gray-400 mx-auto" />
          <p className="text-xs font-medium text-gray-500">No active project target dates</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {deadlines.map((proj) => (
            <Link
              key={proj.id}
              href={`/workspaces/${workspaceId}/projects`}
              className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-100/80 transition-colors flex items-center justify-between gap-3 group"
            >
              <div className="space-y-0.5 min-w-0">
                <h4 className="font-semibold text-sm text-gray-900 truncate group-hover:text-amber-600 transition-colors">
                  {proj.name}
                </h4>
                <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                  <UserCheck className="h-3.5 w-3.5 text-gray-400" />
                  <span>{proj.clientName}</span>
                </p>
              </div>

              {proj.targetDate && (
                <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100 flex items-center gap-1">
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
