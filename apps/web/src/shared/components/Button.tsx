import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@shared/utils/cn';

export type ButtonVariant =
  | 'primary'
  | 'yellow'
  | 'blue'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'on-dark'
  | 'icon';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-charcoal)] rounded-[var(--radius-full)]',
  yellow:
    'bg-[var(--color-brand-yellow)] text-[var(--color-primary)] hover:bg-[var(--color-brand-yellow-deep)] rounded-[var(--radius-full)]',
  blue:
    'bg-[var(--color-brand-blue)] text-[var(--color-on-primary)] hover:bg-[var(--color-blue-pressed)] rounded-[var(--radius-full)]',
  secondary:
    'bg-transparent text-[var(--color-ink)] border border-[var(--color-hairline-strong)] hover:bg-[var(--color-surface-soft)] rounded-[var(--radius-full)]',
  ghost:
    'bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-surface)] rounded-[var(--radius-md)]',
  link:
    'bg-transparent text-[var(--color-brand-blue)] underline-offset-4 hover:underline p-0 h-auto rounded-none',
  'on-dark':
    'bg-[var(--color-on-dark)] text-[var(--color-primary)] hover:bg-[var(--color-surface-soft)] rounded-[var(--radius-full)]',
  icon:
    'bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-hairline)] hover:bg-[var(--color-surface)] rounded-[var(--radius-full)] h-9 w-9 p-0',
};

const sizeStyles: Record<Exclude<ButtonSize, 'icon'>, string> = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-11 px-6 text-sm',
  lg: 'h-14 px-8 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-blue)] disabled:opacity-50 disabled:pointer-events-none';

    const sizeClass = variant === 'link' || variant === 'icon' ? '' : sizeStyles[size as Exclude<ButtonSize, 'icon'>] ?? sizeStyles.md;

    return (
      <button
        ref={ref}
        className={cn(base, variantStyles[variant], sizeClass, className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
