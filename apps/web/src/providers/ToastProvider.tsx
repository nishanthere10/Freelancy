'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      expand
      theme="light"
      toastOptions={{
        style: {
          fontFamily: 'var(--font-family-sans)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-canvas)',
          color: 'var(--color-ink)',
          boxShadow: 'var(--shadow-modal)',
        },
      }}
    />
  );
}
