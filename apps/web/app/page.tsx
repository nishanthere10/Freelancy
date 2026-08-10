import { Metadata } from 'next';
import { MarketingNav, HeroSection, FeatureGrid, MarketingFooter } from '../src/features/marketing/components';

export const metadata: Metadata = {
  title: 'Freelancy — The visual workspace for freelancers',
  description: 'Manage projects, collaborate with clients, and organize your freelance business in one limitless canvas.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] selection:bg-[var(--color-brand-yellow)] selection:text-[var(--color-primary)]">
      <MarketingNav />
      <main>
        <HeroSection />
        <FeatureGrid />
      </main>
      <MarketingFooter />
    </div>
  );
}
