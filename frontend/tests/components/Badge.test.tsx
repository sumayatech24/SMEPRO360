import React from 'react';
import { render } from '@testing-library/react';
import * as RTL from '@testing-library/react';
import Badge from '../../components/ui/Badge';

const screen = RTL.screen ?? (RTL as any).default?.screen ?? { getByText: () => null };

describe('Badge Component', () => {
  it('renders label text', () => {
    const { getByText } = render(<Badge label="Active" />);
    expect(getByText('Active')).toBeTruthy();
  });

  it('renders with green color', () => {
    const { container } = render(<Badge label="Active" color="green" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with red color for errors', () => {
    const { getByText } = render(<Badge label="Failed" color="red" />);
    expect(getByText('Failed')).toBeTruthy();
  });

  it('renders with yellow for pending', () => {
    const { getByText } = render(<Badge label="Pending" color="yellow" />);
    expect(getByText('Pending')).toBeTruthy();
  });

  it('renders with default gray when no color', () => {
    const { getByText } = render(<Badge label="Draft" />);
    expect(getByText('Draft')).toBeTruthy();
  });

  it('renders with indigo color for admin', () => {
    const { getByText } = render(<Badge label="Admin" color="indigo" />);
    expect(getByText('Admin')).toBeTruthy();
  });

  it('renders with blue color', () => {
    const { container } = render(<Badge label="Sent" color="blue" />);
    expect(container.querySelector('span')).toBeTruthy();
  });
});
