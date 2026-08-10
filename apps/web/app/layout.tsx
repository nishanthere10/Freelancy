import type { Metadata } from 'next';
import { AppProviders } from '@providers/AppProviders';
import { NavigationWrapper } from '@shared/components/NavigationWrapper';
import { Agentation } from 'agentation';
import './globals.css';

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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full antialiased bg-gray-50 flex flex-col" suppressHydrationWarning>
        <AppProviders>
          <NavigationWrapper />
          <main className="flex-1 flex flex-col">{children}</main>
        </AppProviders>
        {process.env.NODE_ENV === 'development' && <Agentation />}
      </body>
    </html>
  );
}
