import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeadsPage from '../../pages/leads/LeadsPage';
import api from '../../api/client';

const mockLeads = {
  items: [
    { id: 1, lead_number: 'LD-00001', first_name: 'Rajesh', last_name: 'Kumar', email: 'rajesh@test.com', company: 'TestCo', status: 'new', priority: 'medium', source: 'website' },
    { id: 2, lead_number: 'LD-00002', first_name: 'Priya', last_name: 'Sharma', email: 'priya@test.com', company: 'AnotherCo', status: 'won', priority: 'high', source: 'referral' },
  ],
  total: 2,
};

describe('LeadsPage', () => {
  beforeEach(() => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('stats')) return Promise.resolve({ data: { total: 2, by_status: { new: 1, won: 1 }, by_source: {} } });
      return Promise.resolve({ data: mockLeads });
    });
  });

  it('renders leads page title', async () => {
    const { getByText } = render(<MemoryRouter><LeadsPage /></MemoryRouter>);
    await waitFor(() => expect(getByText('Lead Management')).toBeTruthy());
  });

  it('displays lead records', async () => {
    const { getByText } = render(<MemoryRouter><LeadsPage /></MemoryRouter>);
    await waitFor(() => expect(getByText('Rajesh Kumar')).toBeTruthy());
  });

  it('shows New Lead button', async () => {
    const { getAllByText } = render(<MemoryRouter><LeadsPage /></MemoryRouter>);
    await waitFor(() => {
      const buttons = getAllByText(/New Lead/i);
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('opens modal when New Lead clicked', async () => {
    const { getAllByText, getByText } = render(<MemoryRouter><LeadsPage /></MemoryRouter>);
    await waitFor(() => getAllByText(/New Lead/i));
    fireEvent.click(getAllByText(/New Lead/i)[0]);
    await waitFor(() => expect(getByText(/Create New Lead/i)).toBeTruthy());
  });

  it('shows lead count', async () => {
    const { getByText } = render(<MemoryRouter><LeadsPage /></MemoryRouter>);
    await waitFor(() => expect(getByText('2 records')).toBeTruthy());
  });

  it('has export button', async () => {
    const { getByText } = render(<MemoryRouter><LeadsPage /></MemoryRouter>);
    await waitFor(() => expect(getByText(/Export/i)).toBeTruthy());
  });
});
