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
        badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      };
    case 'project':
      return {
        icon: eventType === 'project.created' ? FolderPlus : Briefcase,
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      };
    case 'invoice':
      return {
        icon: eventType === 'invoice.paid' ? CreditCard : eventType === 'invoice.created' ? FileText : Receipt,
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      };
    case 'member':
    case 'workspace':
    default:
      return {
        icon: Users,
        badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
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
      return `/workspaces/${workspaceId}/projects/${entityId}`;
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
    <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border/40 bg-card/60 hover:bg-card/90 transition-all duration-150 group">
      {/* Icon Badge */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-xs ${badgeClass}`}
      >
        <Icon size={16} weight="duotone" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
          {activity.message}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
          {activity.actor && (
            <span className="font-medium text-foreground/80">
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
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
