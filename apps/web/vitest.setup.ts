import { vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Pacifico: () => ({ className: 'className', variable: '--font-pacifico' }),
  Inter: () => ({ className: 'className', variable: '--font-inter' }),
  Roboto: () => ({ className: 'className', variable: '--font-roboto' }),
}));
