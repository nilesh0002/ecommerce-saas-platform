import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './mocks/server';

// Polyfill ECMAScript Set methods for Node < 22 environments (e.g. Node 20 in CI)
/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof (Set.prototype as any).intersection !== 'function') {
  (Set.prototype as any).intersection = function <T>(this: Set<T>, other: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const elem of this) {
      if (other.has(elem)) {
        result.add(elem);
      }
    }
    return result;
  };
}

if (typeof (Set.prototype as any).difference !== 'function') {
  (Set.prototype as any).difference = function <T>(this: Set<T>, other: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const elem of this) {
      if (!other.has(elem)) {
        result.add(elem);
      }
    }
    return result;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
