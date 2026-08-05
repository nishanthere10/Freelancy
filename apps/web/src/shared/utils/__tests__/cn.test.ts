import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('combines class names', () => {
    const result = cn('px-4', 'py-2');
    expect(result).toBe('px-4 py-2');
  });

  it('handles falsy values', () => {
    const result = cn('px-4', false, 'py-2', null, undefined);
    expect(result).toBe('px-4 py-2');
  });

  it('merges tailwind classes correctly', () => {
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toContain('base');
    expect(result).toContain('active');
  });

  it('merges conflicting utilities', () => {
    const result = cn('flex justify-start', 'justify-end');
    expect(result).toContain('flex');
    expect(result).toContain('justify-end');
    expect(result).not.toContain('justify-start');
  });
});
