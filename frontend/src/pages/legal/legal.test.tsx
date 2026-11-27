import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PrivacyPage } from './PrivacyPage';
import { TermsPage } from './TermsPage';
import { Footer } from '@/components/nav/Footer';
import { NotFoundPage } from '../NotFoundPage';

const wrap = (el: JSX.Element) => render(<MemoryRouter>{el}</MemoryRouter>);

describe('legal pages', () => {
  it('privacy says what is collected, who processes it, the rights and the storage used', () => {
    wrap(<PrivacyPage />);
    for (const h of ['What we collect', 'Who processes it', 'How long we keep it', 'Your rights', 'Cookies and storage']) {
      expect(screen.getByRole('heading', { level: 2, name: h })).toBeInTheDocument();
    }
    expect(document.title).toBe('Privacy | RoamGem');
  });

  it('terms explain estimates, partner links, Plus and the Trip pass', () => {
    wrap(<TermsPage />);
    for (const h of ['Estimates, not promises', 'Partner links', 'Plus and the Trip pass', 'Community photos and gems']) {
      expect(screen.getByRole('heading', { level: 2, name: h })).toBeInTheDocument();
    }
    expect(document.title).toBe('Terms | RoamGem');
  });

  it('the footer links to both', () => {
    wrap(<Footer />);
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
  });

  it('the 404 page uses the current design and a title', () => {
    const { container } = wrap(<NotFoundPage />);
    expect(container.innerHTML).not.toMatch(/mercury|starlight/);
    expect(document.title).toBe('Page not found | RoamGem');
  });
});
