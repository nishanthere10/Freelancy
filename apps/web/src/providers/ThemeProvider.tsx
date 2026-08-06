'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * Locks theme to light — the design system is a stark-white canvas.
 * Disable system/dark modes intentionally per the design language.
 */
export function CustomThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}
