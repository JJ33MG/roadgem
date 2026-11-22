import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ myInvite: vi.fn(async () => ({ code: 'ABCD2345', url: 'https://routify.test/signup?invite=ABCD2345' })) }));
vi.mock('@/lib/community', () => api);
import { InvitePanel } from './InvitePanel';

describe('InvitePanel', () => {
  it('shows the personal link and copies it', async () => {
    const write = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true });
    render(<InvitePanel />);
    expect(await screen.findByText('https://routify.test/signup?invite=ABCD2345')).toBeInTheDocument();
    expect(screen.getByText('A friend who signs up through your link gets 2 weeks of Plus. You get 1 week for every friend.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(write).toHaveBeenCalledWith('https://routify.test/signup?invite=ABCD2345');
  });
});
