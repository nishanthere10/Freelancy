import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@shared/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        className={cn(
          'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus:ring-red-100',
          className
        )}
        {...props}
      />
    );

    if (!error) {
      return input;
    }

    return (
      <div className="flex flex-col gap-1">
        {input}
        <span className="text-xs text-red-600">{error}</span>
      </div>
    );
  }
);

Input.displayName = 'Input';
