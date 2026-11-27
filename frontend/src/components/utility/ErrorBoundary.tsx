import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '@/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('RoamGem error boundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="section py-80 text-center">
            <h2 className="text-heading font-display font-w360 text-starlight">{i18n.t('error.title')}</h2>
            <p className="mt-12 text-body-sm text-silver">{i18n.t('error.body')}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
