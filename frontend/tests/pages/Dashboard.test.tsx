import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';
import api from '../../api/client';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => <div data-testid="line-chart" />,
  BarChart: () => <div data-testid="bar-chart" />,
  PieChart: () => <div data-testid="pie-chart" />,
  Pie: () => <div />, Cell: () => <div />,
  Line: () => <div />, Bar: () => <div />,
  XAxis: () => <div />, YAxis: () => <div />,
  CartesianGrid: () => <div />, Tooltip: () => <div />, Legend: () => <div />,
}));

const mockDashboardData = {
  summary: { total_leads: 42, total_customers: 15, total_employees: 12, open_tickets: 7, active_projects: 5, total_products: 20 },
  financials: { total_revenue: 1250000, total_invoices: 28 },
  revenue_trend: [{ month: 'Jan', revenue: 100000 }, { month: 'Feb', revenue: 150000 }],
  lead_by_status: [{ status: 'new', count: 10 }],
  recent_orders: [],
};

describe('Dashboard Page', () => {
  beforeEach(() => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
  });

  it('renders dashboard heading', async () => {
    const { getByText } = render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await waitFor(() => expect(getByText('Dashboard')).toBeTruthy());
  });

  it('shows Total Leads KPI card', async () => {
    const { getByText } = render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await waitFor(() => expect(getByText('Total Leads')).toBeTruthy());
  });

  it('renders Revenue Trend section', async () => {
    const { getByText } = render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await waitFor(() => expect(getByText('Revenue Trend')).toBeTruthy());
  });

  it('shows welcome message', async () => {
    const { getByText } = render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await waitFor(() => expect(getByText(/Welcome/i)).toBeTruthy());
  });
});
