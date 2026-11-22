import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ signup: vi.fn(async () => {}) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth }));
import { SignupPage } from './SignupPage';

describe('SignupPage', () => {
  it('welcomes a friend who was invited and sends the invite code with the sign-up', async () => {
    render(<MemoryRouter initialEntries={['/signup?invite=ABCD2345']}><SignupPage /></MemoryRouter>);
    expect(screen.getByText('A friend gave you 2 weeks of Plus. Make your account to start.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ann' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ann@example.com' } });
    fireEvent.change(screen.getByLabelText('Password, at least 8 characters'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make my account' }));
    await waitFor(() => expect(auth.signup).toHaveBeenCalledWith('ann@example.com', 'secret123', 'Ann', 'ABCD2345'));
  });
});
