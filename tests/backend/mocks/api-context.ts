import { vi } from 'vitest';

export function createMockAPIContext() {
  return {
    request: {
      headers: {},
      query: {},
      params: {},
      body: {},
    },
    response: {
      status: vi.fn(),
      json: vi.fn(),
      send: vi.fn(),
    },
  };
}

export function createMockAPIError(code: string, message: string) {
  const error = new Error(message);
  (error as any).code = code;
  return error;
}
