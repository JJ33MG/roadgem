import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { citiesStartingWith } from '@/lib/cities';
import { CityField } from './CityField';

vi.mock('@/lib/apiClient', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ data: [] }) } }));

function Harness() {
  const [v, setV] = useState('');
  return <CityField id="to" label="To" value={v} placeholder="Brussels" onChange={setV} />;
}

describe('city suggestions', () => {
  it('suggests Brussels as soon as you type a B', () => {
    expect(citiesStartingWith('b', 6)).toContain('Brussels, Belgium');
    expect(citiesStartingWith('bru', 6)[0]).toBe('Brussels, Belgium');
    expect(citiesStartingWith('', 6)).toEqual([]);
  });

  it('ignores accents and case', () => {
    expect(citiesStartingWith('zur', 6)).toContain('Zürich, Switzerland');
    expect(citiesStartingWith('SAN SEB', 6)).toContain('San Sebastián, Spain');
  });

  it('shows the list on the first letter and fills the field on a click', () => {
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'To' });
    fireEvent.change(input, { target: { value: 'B' } });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('option', { name: 'Brussels, Belgium' }));
    expect(input).toHaveValue('Brussels, Belgium');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('can be used with the keyboard', () => {
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'To' });
    fireEvent.change(input, { target: { value: 'Bru' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('Brussels, Belgium');
    fireEvent.change(input, { target: { value: 'Ma' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
});
