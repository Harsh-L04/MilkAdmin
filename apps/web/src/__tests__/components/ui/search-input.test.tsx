import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from '@/components/ui/search-input';

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput value="" onValueChange={vi.fn()} placeholder="Search…" />);
    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Search…');
  });

  it('calls onValueChange on input', async () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onValueChange={onChange} />);
    await userEvent.type(screen.getByRole('searchbox'), 'test');
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it('shows clear button when value is not empty', () => {
    render(<SearchInput value="test" onValueChange={vi.fn()} />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clears value on clear button click', async () => {
    const onChange = vi.fn();
    render(<SearchInput value="test" onValueChange={onChange} />);
    await userEvent.click(screen.getByLabelText('Clear search'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('hides clear button when value is empty', () => {
    render(<SearchInput value="" onValueChange={vi.fn()} />);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });
});
