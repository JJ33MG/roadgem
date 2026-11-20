import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const login = vi.fn().mockResolvedValue(undefined);
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ login, user: null, isLoading: false }) }));
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('goes back to the page that asked for the login', async () => {
    render(
      <MemoryRouter initialEntries={['/login?next=%2Fcommunity%2Fpost%3FgemId%3Dg1']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/community/post" element={<p>Post page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.c' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(screen.getByText('Post page')).toBeInTheDocument());
  });
});
