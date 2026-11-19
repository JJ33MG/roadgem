import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };

/** The machined pill: one primary style (the accent) and a metal secondary. Always 48px or taller. */
export function Button({ variant = 'secondary', className, type = 'button', ...rest }: Props) {
  return <button type={type} className={clsx(variant === 'primary' ? 'btn-primary' : 'btn-header', 'min-h-[48px]', className)} {...rest} />;
}
