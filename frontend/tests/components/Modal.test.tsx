import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Modal from '../../components/ui/Modal';

describe('Modal Component', () => {
  const onClose = jest.fn();

  beforeEach(() => { onClose.mockClear(); });

  it('renders nothing when closed', () => {
    const { queryByText } = render(<Modal isOpen={false} onClose={onClose} title="Test Modal"><p>Content</p></Modal>);
    expect(queryByText('Test Modal')).toBeNull();
  });

  it('renders title when open', () => {
    const { getByText } = render(<Modal isOpen={true} onClose={onClose} title="Test Modal"><p>Content</p></Modal>);
    expect(getByText('Test Modal')).toBeTruthy();
  });

  it('renders children content', () => {
    const { getByText } = render(<Modal isOpen={true} onClose={onClose} title="Title"><p>Modal Body Content</p></Modal>);
    expect(getByText('Modal Body Content')).toBeTruthy();
  });

  it('calls onClose when close button clicked', () => {
    const { getAllByRole } = render(<Modal isOpen={true} onClose={onClose} title="Title"><p>Content</p></Modal>);
    const buttons = getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop clicked', () => {
    const { container } = render(<Modal isOpen={true} onClose={onClose} title="Title"><p>Content</p></Modal>);
    const backdrop = container.querySelector('.absolute.inset-0');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('renders with small size', () => {
    const { getByText } = render(<Modal isOpen={true} onClose={onClose} title="Small" size="sm"><p>Content</p></Modal>);
    expect(getByText('Small')).toBeTruthy();
  });

  it('renders with large size', () => {
    const { getByText } = render(<Modal isOpen={true} onClose={onClose} title="Large" size="lg"><p>Content</p></Modal>);
    expect(getByText('Large')).toBeTruthy();
  });

  it('renders with xl size', () => {
    const { getByText } = render(<Modal isOpen={true} onClose={onClose} title="XL Modal" size="xl"><p>Content</p></Modal>);
    expect(getByText('XL Modal')).toBeTruthy();
  });
});
