import Link from 'next/link';
import { Pacifico } from 'next/font/google';
import { ChevronDown } from 'lucide-react';

const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
});

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-[var(--color-canvas)]/80 backdrop-blur-md border-b border-[var(--color-hairline)] h-20 transition-all duration-300">
      <div className="max-w-[1280px] mx-auto px-8 h-full flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <span className={`${pacifico.className} text-[26px] text-[var(--color-ink-deep)] group-hover:text-[var(--color-brand-blue)] transition-colors mt-1`}>
            Freelancy
          </span>
        </Link>

        {/* Links (Desktop) */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#product" className="group flex items-center gap-1 text-[15px] font-medium text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors">
            Product <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" />
          </Link>
          <Link href="#solutions" className="group flex items-center gap-1 text-[15px] font-medium text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors">
            Solutions <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" />
          </Link>
          <Link href="#pricing" className="text-[15px] font-medium text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors">
            Pricing
          </Link>
          <Link href="#resources" className="text-[15px] font-medium text-[var(--color-slate)] hover:text-[var(--color-ink)] transition-colors">
            Resources
          </Link>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-5">
          <Link href="/sign-in" className="text-[15px] font-medium text-[var(--color-charcoal)] hover:text-[var(--color-ink)] transition-colors hidden sm:block">
            Log in
          </Link>
          <div className="h-6 w-px bg-[var(--color-hairline)] hidden sm:block"></div>
          <Link
            href="/sign-up"
            className="px-6 py-2.5 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--radius-full)] text-[15px] font-medium hover:bg-[var(--color-charcoal)] transition-colors shadow-sm"
          >
            Get started free
          </Link>
        </div>
      </div>
    </nav>
  );
}
