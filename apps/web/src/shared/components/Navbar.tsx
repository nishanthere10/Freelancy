'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Pacifico } from 'next/font/google';
import { ChartPie, SquaresFour, Users, Briefcase, Receipt } from '@phosphor-icons/react';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';

const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
});

export function Navbar() {
  const pathname = usePathname();
  const params = useParams();

  const workspaceId = params?.workspaceId as string | undefined;

  const navItems = [
    {
      label: 'Dashboard',
      href: workspaceId ? `/workspaces/${workspaceId}/dashboard` : '/dashboard',
      active: pathname?.includes('/dashboard'),
      icon: ChartPie,
    },
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
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[var(--color-hairline-soft)] shadow-[var(--shadow-subtle)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand */}
        <Link href="/workspaces" className="flex items-center gap-2 group">
          <span className={`${pacifico.className} text-[24px] text-[var(--color-ink-deep)] group-hover:text-[var(--color-brand-blue)] transition-colors mt-0.5`}>
            Freelancy
          </span>
        </Link>


        {/* Navigation Links & User Controls */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1 sm:gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-[var(--radius-full)] transition-all duration-150 ${
                    item.active
                      ? 'bg-[var(--color-brand-yellow)] text-[var(--color-primary)] font-semibold shadow-xs'
                      : 'text-[var(--color-slate-text)] hover:text-[var(--color-ink-deep)] hover:bg-[var(--color-surface-soft)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pl-3 border-l border-[var(--color-hairline-soft)] flex items-center gap-2">
            <SignedIn>
              <UserButton afterSignOutUrl="/sign-in" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-[var(--color-charcoal)] hover:text-[var(--color-ink-deep)] hover:bg-[var(--color-surface-soft)] rounded-[var(--radius-full)] transition">
                  Sign In
                </button>
              </SignInButton>
              <Link
                href="/sign-up"
                className="px-4 py-2 text-sm font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-charcoal)] text-[var(--color-on-primary)] rounded-[var(--radius-full)] transition shadow-xs hover:scale-[1.02] active:scale-[0.98]"
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

