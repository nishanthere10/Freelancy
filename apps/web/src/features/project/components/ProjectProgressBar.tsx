'use client';

import React from 'react';
import { CheckCircle, Clock, Warning, TrendUp } from '@phosphor-icons/react';
import type { ProjectProgress } from '../api';

interface ProjectProgressBarProps {
  progress: ProjectProgress;
}

export const ProjectProgressBar: React.FC<ProjectProgressBarProps> = ({
  progress,
}) => {
  const isOverrun = progress.totalLoggedHours > progress.totalEstimatedHours;
  const overrunHours = isOverrun
    ? (progress.totalLoggedHours - progress.totalEstimatedHours).toFixed(1)
    : '0.0';

  return (
    <div className="p-6 rounded-[var(--radius-xl)] bg-white border border-[var(--color-hairline-soft)] shadow-[var(--shadow-card)] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-[var(--radius-md)] bg-[var(--color-teal-light)] text-[var(--color-brand-teal)]">
              <CheckCircle className="h-4 w-4" weight="bold" />
            </span>
            <h3 className="text-base font-bold text-[var(--color-ink-deep)]">
              Execution Progress
            </h3>
          </div>
          <p className="text-xs text-[var(--color-slate-text)] font-medium">
            {progress.totalCount > 0 ? (
              <>
                <span className="font-semibold text-[var(--color-ink-deep)]">
                  {progress.completedCount}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-[var(--color-ink-deep)]">
                  {progress.totalCount}
                </span>{' '}
                deliverables completed
                {progress.inProgressCount > 0 && (
                  <span className="ml-1.5 text-[var(--color-brand-blue)]">
                    ({progress.inProgressCount} in progress)
                  </span>
                )}
              </>
            ) : (
              'No deliverables assigned yet.'
            )}
          </p>
        </div>

        <div className="flex items-baseline gap-1.5 self-start sm:self-auto">
          <span className="text-3xl font-extrabold text-[var(--color-ink-deep)] tracking-tight font-mono">
            {progress.completionPercentage}%
          </span>
          <span className="text-xs text-[var(--color-slate-text)] uppercase font-bold tracking-wider">
            done
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-[var(--color-surface-soft)] h-3 rounded-full overflow-hidden p-0.5 border border-[var(--color-hairline-soft)]">
        <div
          role="progressbar"
          aria-valuenow={progress.completionPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-[var(--color-brand-teal)] via-[var(--color-brand-blue)] to-[var(--color-brand-yellow-deep)]"
          style={{ width: `${Math.min(100, Math.max(0, progress.completionPercentage))}%` }}
        />
      </div>

      {/* Hours Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[var(--color-hairline-soft)] text-xs">
        <div className="space-y-0.5">
          <span className="text-[var(--color-slate-text)] font-medium flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Estimated
          </span>
          <p className="font-mono font-bold text-sm text-[var(--color-ink-deep)]">
            {progress.totalEstimatedHours}h
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-[var(--color-slate-text)] font-medium flex items-center gap-1">
            <TrendUp className="h-3.5 w-3.5" /> Logged
          </span>
          <p className="font-mono font-bold text-sm text-[var(--color-ink-deep)]">
            {progress.totalLoggedHours}h
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-[var(--color-slate-text)] font-medium">Remaining</span>
          <p className="font-mono font-bold text-sm text-[var(--color-ink-deep)]">
            {progress.remainingHours}h
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-[var(--color-slate-text)] font-medium">Budget Balance</span>
          {isOverrun ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error-border)]">
              <Warning className="h-3 w-3" /> +{overrunHours}h overrun
            </span>
          ) : (
            <p className="font-mono font-bold text-sm text-[var(--color-moss-dark)]">
              On track
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
