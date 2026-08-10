'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { SquaresFour, Users, Briefcase, Receipt, Lightning } from '@phosphor-icons/react';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';

export function Navbar() {
  const pathname = usePathname();
  const params = useParams();

  const workspaceId = params?.workspaceId as string | undefined;

  const navItems = [
    {
      label: 'Workspaces',
      href: '/workspaces',
      active: pathname === '/workspaces',
      icon: SquaresFour,
    },
    {
      label: 'Clients',
      href: workspaceId ? `/workspaces/${workspaceId}/clients` : '/clients',
      active: pathname?.includes('/clients'),
      icon: Users,
    },
    {
      label: 'Projects',
      href: workspaceId ? `/workspaces/${workspaceId}/projects` : '/projects',
      active: pathname?.includes('/projects'),
      icon: Briefcase,
    },
    {
      label: 'Invoices',
      href: workspaceId ? `/workspaces/${workspaceId}/invoices` : '/invoices',
      active: pathname?.includes('/invoices'),
      icon: Receipt,
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

        {/* Navigation Links & User Controls */}
        <div className="flex items-center gap-4">
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

          <div className="pl-2 border-l border-gray-200 flex items-center gap-2">
            <SignedIn>
              <UserButton afterSignOutUrl="/sign-in" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-100 rounded-lg transition">
                  Sign In
                </button>
              </SignInButton>
              <Link
                href="/sign-up"
                className="px-3.5 py-1.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-xs"
              >
                Get Started
              </Link>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
}

