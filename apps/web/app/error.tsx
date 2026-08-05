'use client';

import { Button } from '@shared/components';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error page triggered:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">500</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-2">
          An unexpected error occurred. Please try again.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-red-600 mb-8 font-mono bg-red-50 p-2 rounded">
            {error.message}
          </p>
        )}
        <Button onClick={reset} variant="primary" size="md">
          Try again
        </Button>
      </div>
    </div>
  );
}
