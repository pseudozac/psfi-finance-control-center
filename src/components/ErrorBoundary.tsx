import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PsFi Uncaught Error:', error, errorInfo);
  }

  private handleHardReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
      }
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) caches.delete(name);
        });
      }
    } finally {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0d0e12',
          color: '#f1f2f6',
          fontFamily: "'Parkinsans', 'Plus Jakarta Sans', system-ui, sans-serif",
          padding: '24px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#15171e',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(247, 141, 44, 0.12)',
              color: '#f78d2c',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <AlertTriangle size={24} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>Something went wrong</h2>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#9096a2', lineHeight: 1.5 }}>
              PsFi encountered an unexpected state. You can reset your local cache or reload the application.
            </p>
            {this.state.error?.message && (
              <pre style={{
                textAlign: 'left',
                backgroundColor: '#0d0e12',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#e15e42',
                overflowX: 'auto',
                marginBottom: '20px',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Reload
              </button>
              <button
                type="button"
                onClick={this.handleHardReset}
                style={{
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: '#bf9ff1',
                  color: '#0d0e12',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RotateCcw size={14} /> Clear Cache &amp; Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
