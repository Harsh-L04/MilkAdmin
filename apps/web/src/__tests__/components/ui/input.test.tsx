import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders and accepts value', () => {
    render(<Input defaultValue="hello" />);
    const input = screen.getByDisplayValue('hello');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange callback', async () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'a');
    expect(handleChange).toHaveBeenCalled();
  });

  it('disabled state', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
