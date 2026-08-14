import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AppProviders } from '@providers/AppProviders';
import { NavigationWrapper } from '@shared/components/NavigationWrapper';
import { Agentation } from 'agentation';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Freelance OS',
  description: 'Operating system for modern freelancers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <body className="min-h-full antialiased bg-[var(--color-canvas)] text-[var(--color-ink)] flex flex-col font-sans" suppressHydrationWarning>
        <AppProviders>
          <NavigationWrapper />
          <main className="flex-1 flex flex-col">{children}</main>
        </AppProviders>
        {process.env.NODE_ENV === 'development' && <Agentation />}
      </body>
    </html>
  );
}
