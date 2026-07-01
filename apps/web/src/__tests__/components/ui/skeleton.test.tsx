import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('renders', () => {
    const { container } = render(<Skeleton className="h-8 w-28" />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
