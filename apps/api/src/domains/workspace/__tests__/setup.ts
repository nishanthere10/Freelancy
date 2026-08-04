import { vi } from 'vitest';

// Mock db/client module before any imports
vi.mock('@/db/client', () => ({
  db: {},
  closeDatabase: vi.fn(),
}));
