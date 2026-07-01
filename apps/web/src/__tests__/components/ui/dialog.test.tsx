import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

describe('Dialog', () => {
  it('open/close works', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>My Dialog</DialogTitle>
          <DialogDescription>Content here</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText('My Dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Open'));
    await waitFor(() => expect(screen.getByText('My Dialog')).toBeInTheDocument());
  });

  it('content rendered when open with onOpenChange', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Open Dialog</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Open Dialog')).toBeInTheDocument();
  });
});
