import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

beforeEach((): void => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }): React.JSX.Element {
  if (shouldThrow) {
    throw new Error('Test render error')
  }
  return <div>Child content rendered</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Hello world</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders fallback UI when child throws during render', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
    expect(screen.getByText('Test render error')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('recovers and renders children after clicking Retry', () => {
    let shouldThrow = true
    function ConditionalThrower(): React.JSX.Element {
      if (shouldThrow) {
        throw new Error('Recoverable error')
      }
      return <div>Recovered successfully</div>
    }

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    shouldThrow = false
    fireEvent.click(screen.getByText('Retry'))

    expect(screen.getByText('Recovered successfully')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('renders pre element with empty message when error message is empty', () => {
    function ThrowNoMessage(): React.JSX.Element {
      throw new Error('')
    }

    render(
      <ErrorBoundary>
        <ThrowNoMessage />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    const pre = document.querySelector('pre')
    expect(pre?.textContent).toBe('')
  })

  it('calls console.error via componentDidCatch', () => {
    const consoleSpy = console.error as ReturnType<typeof vi.fn>

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(consoleSpy).toHaveBeenCalled()
    const catchCall = consoleSpy.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('ErrorBoundary caught an error')
    )
    expect(catchCall).toBeDefined()
  })
})
