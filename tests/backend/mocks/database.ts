import { vi } from 'vitest';

export interface MockDatabase {
  query: ReturnType<typeof vi.fn>;
  queryRow: ReturnType<typeof vi.fn>;
  queryAll: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
  rawQuery: ReturnType<typeof vi.fn>;
  rawQueryAll: ReturnType<typeof vi.fn>;
  rawQueryRow: ReturnType<typeof vi.fn>;
  rawExec: ReturnType<typeof vi.fn>;
  begin: ReturnType<typeof vi.fn>;
}

export function createMockDatabase(): MockDatabase {
  return {
    query: vi.fn(),
    queryRow: vi.fn(),
    queryAll: vi.fn(),
    exec: vi.fn(),
    rawQuery: vi.fn(),
    rawQueryAll: vi.fn(),
    rawQueryRow: vi.fn(),
    rawExec: vi.fn(),
    begin: vi.fn(),
  };
}

export function createMockTransaction() {
  return {
    query: vi.fn(),
    queryRow: vi.fn(),
    queryAll: vi.fn(),
    exec: vi.fn(),
    rawQuery: vi.fn(),
    rawQueryAll: vi.fn(),
    rawQueryRow: vi.fn(),
    rawExec: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
  };
}
