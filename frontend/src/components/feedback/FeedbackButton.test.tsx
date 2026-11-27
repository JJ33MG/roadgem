import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackButton } from './FeedbackButton';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/apiClient', () => ({ apiClient: { post } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

// 27 Nov: testers report a bug or an idea in two clicks, from any page.
describe('FeedbackButton', () => {
  it('sends the type, the message, the page and an email, then thanks the tester', async () => {
    post.mockResolvedValue({ data: { ok: true } });
    render(<MemoryRouter initialEntries={['/trips/t1']}><FeedbackButton /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Bug' }));
    fireEvent.change(screen.getByLabelText('What happened or what would you like?'), { target: { value: 'Day 2 map is empty' } });
    fireEvent.change(screen.getByLabelText('Your email (optional, for a reply)'), { target: { value: 't@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/feedback', { type: 'bug', message: 'Day 2 map is empty', page: '/trips/t1', email: 't@example.com' }));
    expect(await screen.findByText('Thanks! We read every message.')).toBeInTheDocument();
  });

  it('does not send an empty message', () => {
    render(<MemoryRouter><FeedbackButton /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
