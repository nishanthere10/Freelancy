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
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--color-hairline)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand */}
        <Link href="/workspaces" className="flex items-center gap-2 group">
          <span className={`${pacifico.className} text-[24px] text-[var(--color-ink-deep)] group-hover:text-[var(--color-brand-blue)] transition-colors mt-0.5`}>
            Freelancy
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

