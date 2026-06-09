import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      // Inline styles are intentional here: this fallback must render legibly
      // even if the stylesheet/CSS Modules failed to load.
      return (
        <div style={{ padding: 24, fontFamily: 'monospace' }}>
          <h2>Something went wrong</h2>
          <pre
            id="boundary-error"
            style={{ whiteSpace: 'pre-wrap', color: '#c92a2a' }}
          >
            {String(this.state.error?.message || this.state.error)}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
