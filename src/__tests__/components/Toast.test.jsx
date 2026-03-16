import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toast from '../../components/Toast';

// Mock the useApp hook
const mockRemoveToast = vi.fn();
let mockToasts = [];

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    toasts: mockToasts,
    removeToast: mockRemoveToast,
  }),
}));

describe('Toast', () => {
  it('renders nothing when no toasts', () => {
    mockToasts = [];
    const { container } = render(<Toast />);
    expect(container.innerHTML).toBe('');
  });

  it('renders toast message', () => {
    mockToasts = [{ id: '1', type: 'success', message: 'Campaign launched!' }];
    render(<Toast />);
    expect(screen.getByText('Campaign launched!')).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    mockToasts = [
      { id: '1', type: 'success', message: 'First toast' },
      { id: '2', type: 'error', message: 'Second toast' },
    ];
    render(<Toast />);
    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('calls removeToast when dismiss button clicked', () => {
    mockToasts = [{ id: 't1', type: 'info', message: 'Test' }];
    render(<Toast />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockRemoveToast).toHaveBeenCalledWith('t1');
  });
});
