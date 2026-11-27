import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const set = vi.hoisted(() => vi.fn());
vi.mock('@/i18n', async (orig) => ({ ...(await orig<typeof import('@/i18n')>()), setLanguage: set }));

import { LanguageSwitcher } from './LanguageSwitcher';

describe('LanguageSwitcher', () => {
  it('shows the current language and switches to the chosen one', () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button', { name: /Language: English/ });
    expect(button).toHaveTextContent('EN');
    fireEvent.click(button);
    expect(screen.getByRole('menuitemradio', { name: 'Nederlands' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Italiano' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Deutsch' }));
    expect(set).toHaveBeenCalledWith('de');
  });
});
