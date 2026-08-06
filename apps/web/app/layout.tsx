import type { Metadata } from 'next';
import { AppProviders } from '@providers/AppProviders';
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
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
        {process.env.NODE_ENV === 'development' && <Agentation />}
      </body>
    </html>
  );
}
