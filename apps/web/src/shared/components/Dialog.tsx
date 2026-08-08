'use client';

/**
 * Dialog component
 * Accessible modal using a portal-rendered overlay
 * Supports ESC key, overlay-click to close, body scroll lock, and focus trap
 */

import { useEffect, useRef, forwardRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { cn } from '@shared/utils/cn';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ open, onOpenChange, title, description, children, className }, ref) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Handle ESC key
    useEffect(() => {
      if (!open) return;
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onOpenChange(false);
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onOpenChange]);

    // Lock body scroll when open
    useEffect(() => {
      if (!open) return;
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }, [open]);

    if (!open || !mounted) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onOpenChange(false);
    };

    const dialogContent = (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleOverlayClick}
        aria-modal="true"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-[var(--color-primary)]/40 backdrop-blur-sm pointer-events-none" />

        {/* Panel */}
        <div
          ref={ref ?? dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'dialog-title' : undefined}
          aria-describedby={description ? 'dialog-description' : undefined}
          className={cn(
            'relative z-50 w-full max-w-md block',
            'bg-[var(--color-canvas)] rounded-[var(--radius-xl)]',
            'border border-[var(--color-hairline)]',
            'shadow-[var(--shadow-modal)]',
            'p-6',
            className
          )}
        >
          {/* Header */}
          {title && (
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4 block">
                <h2
                  id="dialog-title"
                  className="text-lg font-medium text-[var(--color-ink-deep)] leading-snug block"
                >
                  {title}
                </h2>
                {description && (
                  <p
                    id="dialog-description"
                    className="mt-1 text-sm text-[var(--color-slate-text)] leading-relaxed block"
                  >
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className={cn(
                  'flex-shrink-0 p-1.5 rounded-[var(--radius-md)]',
                  'text-[var(--color-steel)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]',
                  'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]'
                )}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Description without title */}
          {!title && description && (
            <p
              id="dialog-description"
              className="text-sm text-[var(--color-slate-text)] mb-4 leading-relaxed block"
            >
              {description}
            </p>
          )}

          {/* Content */}
          <div>{children}</div>
        </div>
      </div>
    );

    return createPortal(dialogContent, document.body);
  }
);

Dialog.displayName = 'Dialog';
