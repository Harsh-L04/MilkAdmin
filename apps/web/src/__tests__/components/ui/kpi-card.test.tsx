import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from '@/components/ui/kpi-card';
import { DollarSign } from 'lucide-react';

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard label="Revenue" value="₹50,000" icon={DollarSign} />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('₹50,000')).toBeInTheDocument();
  });

  it('renders trend indicator', () => {
    render(
      <KpiCard
        label="Orders"
        value="100"
        icon={DollarSign}
        trend={{ value: '12%', direction: 'up' }}
      />,
    );
    expect(screen.getByText('12%')).toBeInTheDocument();
  });

  it('shows skeleton when loading', () => {
    render(<KpiCard label="Loading" value="100" icon={DollarSign} loading />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });
});
