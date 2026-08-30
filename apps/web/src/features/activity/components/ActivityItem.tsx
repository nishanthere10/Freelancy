'use client';

import Link from 'next/link';
import {
  Briefcase,
  Buildings,
  CreditCard,
  FileText,
  FolderPlus,
  Receipt,
  UserPlus,
  Users,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import type { ActivityItemDTO } from '../api/activity.types';

interface ActivityItemProps {
  activity: ActivityItemDTO;
  workspaceId: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getEventStyling(eventType: string, entityType: string): {
  icon: PhosphorIcon;
  badgeClass: string;
} {
  switch (entityType) {
    case 'client':
      return {
        icon: eventType === 'client.created' ? UserPlus : Buildings,
        badgeClass: 'bg-[var(--color-teal-light)] text-[var(--color-brand-teal)] border-[var(--color-brand-teal)]/20',
      };
    case 'project':
      return {
        icon: eventType === 'project.created' ? FolderPlus : Briefcase,
        badgeClass: 'bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)] border-[var(--color-brand-yellow)]/30',
      };
    case 'invoice':
      return {
        icon: eventType === 'invoice.paid' ? CreditCard : eventType === 'invoice.created' ? FileText : Receipt,
        badgeClass: 'bg-[var(--color-rose-light)] text-[var(--color-brand-rose)] border-[var(--color-brand-rose)]/20',
      };
    case 'member':
    case 'workspace':
    default:
      return {
        icon: Users,
        badgeClass: 'bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] border-[var(--color-brand-blue)]/20',
      };
  }
}

function getEntityHref(
  workspaceId: string,
  entityType: string,
  entityId: string | null
): string | null {
  if (!entityId) return null;

  switch (entityType) {
    case 'client':
      return `/workspaces/${workspaceId}/clients`;
    case 'project':
      return `/workspaces/${workspaceId}/projects`;
    case 'invoice':
      return `/workspaces/${workspaceId}/invoices`;
    default:
      return null;
  }
}

export function ActivityItem({ activity, workspaceId }: ActivityItemProps) {
  const { icon: Icon, badgeClass } = getEventStyling(
    activity.eventType,
    activity.entityType
  );
  const href = getEntityHref(workspaceId, activity.entityType, activity.entityId);
  const relativeTime = formatRelativeTime(activity.createdAt);

  const content = (
    <div className="flex items-start gap-3.5 p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-hairline-soft)] bg-white hover:bg-[var(--color-surface-soft)] transition-all duration-150 group">
      {/* Icon Badge */}
      <div
        className={`w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 border shadow-xs ${badgeClass}`}
      >
        <Icon size={16} weight="duotone" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-[var(--color-ink-deep)] leading-snug group-hover:text-[var(--color-brand-blue)] transition-colors">
          {activity.message}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--color-steel)]">
          {activity.actor && (
            <span className="font-medium text-[var(--color-charcoal)]">
              {activity.actor.name}
            </span>
          )}
          {activity.actor && <span>•</span>}
          <span>{relativeTime}</span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)] rounded-[var(--radius-lg)]">
        {content}
      </Link>
    );
  }

  return content;
}
