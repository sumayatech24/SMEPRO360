import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TicketsPage from '../../pages/helpdesk/TicketsPage';
import api from '../../api/client';

const mockTickets = {
  items: [
    { id: 1, ticket_number: 'TKT-00001', subject: 'Login Issue', description: 'Cannot login', priority: 'high', status: 'open', category: 'bug' },
    { id: 2, ticket_number: 'TKT-00002', subject: 'Slow Dashboard', description: 'Dashboard loads slow', priority: 'medium', status: 'in_progress', category: 'support' },
  ],
  total: 2,
};

describe('TicketsPage', () => {
  beforeEach(() => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('stats')) return Promise.resolve({ data: { total: 2, open: 1, in_progress: 1 } });
      return Promise.resolve({ data: mockTickets });
    });
  });

  it('renders helpdesk title', async () => {
    const { getByText } = render(<MemoryRouter><TicketsPage /></MemoryRouter>);
    await waitFor(() => expect(getByText('Helpdesk Tickets')).toBeTruthy());
  });

  it('shows tickets in list', async () => {
    const { getByText } = render(<MemoryRouter><TicketsPage /></MemoryRouter>);
    await waitFor(() => expect(getByText('Login Issue')).toBeTruthy());
  });

  it('shows ticket numbers', async () => {
    const { getByText } = render(<MemoryRouter><TicketsPage /></MemoryRouter>);
    await waitFor(() => expect(getByText('TKT-00001')).toBeTruthy());
  });

  it('shows New Ticket button', async () => {
    const { getAllByText } = render(<MemoryRouter><TicketsPage /></MemoryRouter>);
    await waitFor(() => {
      const buttons = getAllByText(/New Ticket/i);
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('opens create modal on button click', async () => {
    const { getAllByText, getByText } = render(<MemoryRouter><TicketsPage /></MemoryRouter>);
    await waitFor(() => getAllByText(/New Ticket/i));
    fireEvent.click(getAllByText(/New Ticket/i)[0]);
    await waitFor(() => expect(getByText(/Create Ticket/i)).toBeTruthy());
  });

  it('displays ticket count', async () => {
    const { getByText } = render(<MemoryRouter><TicketsPage /></MemoryRouter>);
    await waitFor(() => expect(getByText('2 records')).toBeTruthy());
  });
});
