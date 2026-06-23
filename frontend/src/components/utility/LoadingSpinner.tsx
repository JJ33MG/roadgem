import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 24, className }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={clsx('animate-spin rounded-full border-2 border-lead border-t-mercury-blue', className)}
      style={{ width: size, height: size }}
    />
  );
}
