import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@shared/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-hairline-strong)]',
          'bg-[var(--color-canvas)] px-4 py-2 text-sm text-[var(--color-ink)]',
          'placeholder:text-[var(--color-steel)]',
          'transition-colors duration-150',
          'focus:outline-none focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-[var(--color-brand-blue)]/20',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-surface)]',
          error && 'border-[var(--color-error-border)] focus:border-[var(--color-error-border)] focus:ring-[var(--color-error)]/20',
          className
        )}
        {...props}
      />
    );

    if (!error) return input;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {input}
        <span className="text-xs text-[var(--color-error)]">{error}</span>
      </div>
    );
  }
);

Input.displayName = 'Input';
