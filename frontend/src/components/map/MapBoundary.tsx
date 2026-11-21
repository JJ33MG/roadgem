import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; className?: string };

/** Keeps the page working when the map engine fails to download or start (weak signal on the road). */
export class MapBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="note" className={`flex items-center justify-center bg-paper-2 p-24 text-center text-[16px] text-muted rt-map ${this.props.className ?? ''}`}>
        The map is not available right now. The plan below has every stop.
      </div>
    );
  }
}
