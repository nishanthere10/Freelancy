import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@shared/utils/cn';

export type CardVariant =
  | 'default'
  | 'feature'
  | 'feature-yellow'
  | 'feature-coral'
  | 'feature-teal'
  | 'feature-rose'
  | 'pricing'
  | 'pricing-featured'
  | 'pricing-enterprise'
  | 'story';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    'bg-[var(--color-canvas)] rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] shadow-[var(--shadow-subtle)] p-6',
  feature:
    'bg-[var(--color-canvas)] rounded-[var(--radius-xxxl)] border border-[var(--color-hairline-soft)] shadow-[var(--shadow-card)] p-8',
  'feature-yellow':
    'bg-[var(--color-brand-yellow)] text-[var(--color-primary)] rounded-[var(--radius-xxxl)] shadow-[var(--shadow-card)] p-8',
  'feature-coral':
    'bg-[var(--color-coral-light)] text-[var(--color-primary)] rounded-[var(--radius-xxxl)] shadow-[var(--shadow-card)] p-8',
  'feature-teal':
    'bg-[var(--color-teal-light)] text-[var(--color-primary)] rounded-[var(--radius-xxxl)] shadow-[var(--shadow-card)] p-8',
  'feature-rose':
    'bg-[var(--color-rose-light)] text-[var(--color-primary)] rounded-[var(--radius-xxxl)] shadow-[var(--shadow-card)] p-8',
  pricing:
    'bg-[var(--color-canvas)] rounded-[var(--radius-xl)] border border-[var(--color-hairline)] p-8',
  'pricing-featured':
    'bg-[var(--color-surface-pricing-featured)] rounded-[var(--radius-xl)] border-2 border-[var(--color-brand-blue)] shadow-[var(--shadow-card)] p-8',
  'pricing-enterprise':
    'bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] p-8',
  story:
    'bg-[var(--color-canvas)] rounded-[var(--radius-xxxl)] border border-[var(--color-hairline-soft)] overflow-hidden p-0',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(variantStyles[variant], className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}
export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-xl font-medium leading-snug tracking-tight text-[var(--color-ink-deep)]',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}
export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm leading-relaxed text-[var(--color-slate-text)]', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}
export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('pt-4', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center pt-6 border-t border-[var(--color-hairline-soft)]',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
