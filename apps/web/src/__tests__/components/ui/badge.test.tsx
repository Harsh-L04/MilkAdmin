import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('renders with all variants', () => {
    const variants = ['default', 'secondary', 'success', 'warning', 'destructive', 'info', 'muted', 'outline'] as const;
    for (const variant of variants) {
      const { rerender } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
      rerender(<></>);
    }
  });

  it('renders dot indicator', () => {
    render(<Badge dot>With dot</Badge>);
    expect(screen.getByText('With dot')).toBeInTheDocument();
  });
});
