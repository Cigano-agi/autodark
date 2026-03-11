import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
          <div className="max-w-md space-y-6">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold text-foreground">
              Algo deu errado
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {this.state.error?.message || 'Ocorreu um erro inesperado.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/dashboard';
              }}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
