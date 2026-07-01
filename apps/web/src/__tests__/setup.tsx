import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage for jsdom
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  });
}

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: function MockImage({ src, alt }: { src: string; alt: string }) {
    return <img src={src} alt={alt} />;
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return <a href={href} {...props}>{children}</a>;
  },
}));
