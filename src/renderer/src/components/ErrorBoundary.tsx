import React from 'react'
import { Button } from './ui/button'
import i18n from '../i18n'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <h2 className="text-xl font-extrabold text-destructive">{i18n.t('error.title')}</h2>
          <p className="text-sm text-muted-foreground max-w-md">{i18n.t('error.description')}</p>
          {this.state.error && (
            <pre className="text-xs text-muted-foreground bg-muted p-3 rounded-md max-w-lg overflow-auto">
              {this.state.error.message}
            </pre>
          )}
          <Button onClick={this.handleRetry} variant="outline">
            {i18n.t('common.retry')}
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
