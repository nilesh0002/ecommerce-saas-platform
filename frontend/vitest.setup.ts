import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './mocks/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
beforeAll(() => (server.listen as any)({ onUnhandledRequest: 'bypass' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());

// Mock Next.js App Router navigation hooks
vi.mock('next/navigation', () => {
  const pushMock = vi.fn();
  const replaceMock = vi.fn();
  return {
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
      prefetch: vi.fn(),
      back: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  };
});
