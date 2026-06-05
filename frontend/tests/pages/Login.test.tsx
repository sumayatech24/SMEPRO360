import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../../pages/Login';
import api from '../../api/client';

jest.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

const renderLogin = () => render(<MemoryRouter><Login /></MemoryRouter>);

describe('Login Page', () => {
  it('renders login form with SMEPRO360 branding', () => {
    const { getByText } = renderLogin();
    expect(getByText(/SMEPRO360/i)).toBeTruthy();
  });

  it('shows email and password inputs', () => {
    const { getByPlaceholderText } = renderLogin();
    expect(getByPlaceholderText(/email/i)).toBeTruthy();
    expect(getByPlaceholderText(/password/i)).toBeTruthy();
  });

  it('has a submit button', () => {
    const { getAllByRole } = renderLogin();
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('allows typing in email field', () => {
    const { getByPlaceholderText } = renderLogin();
    const emailInput = getByPlaceholderText(/email/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });
    expect(emailInput.value).toBe('admin@test.com');
  });

  it('allows typing in password field', () => {
    const { getByPlaceholderText } = renderLogin();
    const pwInput = getByPlaceholderText(/password/i) as HTMLInputElement;
    fireEvent.change(pwInput, { target: { value: 'mypassword' } });
    expect(pwInput.value).toBe('mypassword');
  });

  it('calls api.post on submit', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: 'test-token',
        user: { id: 1, email: 'admin@smepro360.com', full_name: 'Admin' },
      },
    });
    const { getByPlaceholderText, getAllByRole } = renderLogin();
    fireEvent.change(getByPlaceholderText(/email/i), { target: { value: 'admin@smepro360.com' } });
    fireEvent.change(getByPlaceholderText(/password/i), { target: { value: 'Admin@123456' } });
    fireEvent.click(getAllByRole('button')[0]);
    await waitFor(() => expect(api.post).toHaveBeenCalled());
  });
});
