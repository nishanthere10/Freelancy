'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fatal Global Application Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full border border-border bg-card rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive text-2xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Application Error</h1>
            <p className="text-sm text-muted-foreground">
              A critical system error occurred. We have logged the incident for investigation.
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-muted-foreground/70 bg-muted/50 py-1 px-2 rounded-md inline-block">
                Digest: {error.digest}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Reload Application
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all border border-border"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
