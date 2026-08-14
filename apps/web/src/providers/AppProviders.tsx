'use client';

import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from './QueryProvider';
import { ToastProvider } from './ToastProvider';
import { CustomThemeProvider } from './ThemeProvider';

const envKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isValidKey = typeof envKey === 'string' && (envKey.startsWith('pk_test_') || envKey.startsWith('pk_live_'));
const publishableKey = isValidKey ? envKey : 'pk_test_Y2xlcmsuZXhhbXBsZS5jb20k';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <CustomThemeProvider>
        <QueryProvider>
          {children}
          <ToastProvider />
        </QueryProvider>
      </CustomThemeProvider>
    </ClerkProvider>
  );
}


