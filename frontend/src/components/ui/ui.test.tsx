import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button, Panel, SliderField, Switch, Toggle } from './index';

describe('Ribbon controls', () => {
  it('Toggle reports its pressed state and the new value', () => {
    const onChange = vi.fn();
    render(<Toggle pressed={false} onChange={onChange}>Campsites</Toggle>);
    const b = screen.getByRole('button', { name: 'Campsites' });
    expect(b).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(b);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Switch is a labelled switch that toggles on click and on Space', () => {
    const onChange = vi.fn();
    render(<Switch checked label="Road gems on the way" onChange={onChange} />);
    const s = screen.getByRole('switch', { name: 'Road gems on the way' });
    expect(s).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(s);
    expect(onChange).toHaveBeenLastCalledWith(false);
    fireEvent.keyDown(s, { key: ' ' });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('SliderField shows its value with the unit and labels the range', () => {
    const onChange = vi.fn();
    render(<SliderField label="Kilometres a day" value={350} min={100} max={800} step={25} unit="km" onChange={onChange} />);
    expect(screen.getByText('350 km')).toBeInTheDocument();
    const r = screen.getByRole('slider', { name: 'Kilometres a day' });
    fireEvent.change(r, { target: { value: '400' } });
    expect(onChange).toHaveBeenCalledWith(400);
  });

  it('Button is at least 48px tall and Panel wraps content', () => {
    render(<Panel><Button variant="primary">Plan my trip</Button></Panel>);
    expect(screen.getByRole('button', { name: 'Plan my trip' }).className).toMatch(/min-h-\[48px\]|min-h-12/);
  });
});
