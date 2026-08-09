'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Squares2X2, Users, Briefcase, Lightning } from '@phosphor-icons/react';

const DEFAULT_WORKSPACE_ID = '550e8400-e29b-41d4-a716-446655440000';

export function Navbar() {
  const pathname = usePathname();
  const params = useParams();

  const currentWorkspaceId =
    (params?.workspaceId as string) || DEFAULT_WORKSPACE_ID;

  const navItems = [
    {
      label: 'Workspaces',
      href: '/workspaces',
      active: pathname === '/workspaces',
      icon: Squares2X2,
    },
    {
      label: 'Clients',
      href: `/workspaces/${currentWorkspaceId}/clients`,
      active: pathname?.includes('/clients'),
      icon: Users,
    },
    {
      label: 'Projects',
      href: `/workspaces/${currentWorkspaceId}/projects`,
      active: pathname?.includes('/projects'),
      icon: Briefcase,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--color-hairline)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand */}
        <Link href="/workspaces" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[var(--color-brand-yellow)] text-black flex items-center justify-center font-bold text-base shadow-sm">
            <Lightning className="h-5 w-5 weight-bold" />
          </div>
          <span className="font-bold text-lg text-[var(--color-ink-deep)] tracking-tight">
            Freelance OS
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                  item.active
                    ? 'bg-[var(--color-brand-yellow)] text-black font-semibold shadow-xs'
                    : 'text-[var(--color-slate-text)] hover:text-black hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
