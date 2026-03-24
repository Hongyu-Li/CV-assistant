import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'
import { SettingsProvider } from './context/SettingsContext'

describe('App', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(
        <SettingsProvider>
          <App />
        </SettingsProvider>
      )
    })
    expect(screen.getAllByText('app.title').length).toBeGreaterThanOrEqual(1)
  })

  it('sets document.title from i18n app.title', async () => {
    await act(async () => {
      render(
        <SettingsProvider>
          <App />
        </SettingsProvider>
      )
    })
    expect(document.title).toBe('app.title')
  })
})

// Mock child components to avoid deep rendering
vi.mock('./pages/Profile', () => ({
  Profile: (): React.JSX.Element => <div data-testid="profile-view">Profile</div>
}))
vi.mock('./pages/Settings', () => ({
  Settings: (): React.JSX.Element => <div data-testid="settings-view">Settings</div>
}))
vi.mock('./pages/Resumes', () => ({
  Resumes: (): React.JSX.Element => <div data-testid="resumes-view">Resumes</div>
}))
vi.mock('./components/ui/sonner', () => ({
  Toaster: (): React.JSX.Element => <div data-testid="toaster" />
}))

async function renderApp(): Promise<void> {
  await act(async () => {
    render(
      <SettingsProvider>
        <App />
      </SettingsProvider>
    )
  })
}

describe('App navigation', () => {
  describe('default view', () => {
    it('renders Resumes view by default', async (): Promise<void> => {
      await renderApp()
      expect(screen.getByTestId('resumes-view')).toBeInTheDocument()
      expect(screen.queryByTestId('profile-view')).not.toBeInTheDocument()
      expect(screen.queryByTestId('settings-view')).not.toBeInTheDocument()
    })
  })

  describe('view switching', () => {
    it('switches to Profile view when Profile button is clicked', async (): Promise<void> => {
      await renderApp()
      fireEvent.click(screen.getByText('app.profile'))
      expect(screen.getByTestId('profile-view')).toBeInTheDocument()
      expect(screen.queryByTestId('resumes-view')).not.toBeInTheDocument()
      expect(screen.queryByTestId('settings-view')).not.toBeInTheDocument()
    })

    it('switches to Settings view when Settings button is clicked', async (): Promise<void> => {
      await renderApp()
      fireEvent.click(screen.getByText('app.settings'))
      expect(screen.getByTestId('settings-view')).toBeInTheDocument()
      expect(screen.queryByTestId('resumes-view')).not.toBeInTheDocument()
      expect(screen.queryByTestId('profile-view')).not.toBeInTheDocument()
    })

    it('switches back to Resumes view from another view', async (): Promise<void> => {
      await renderApp()
      fireEvent.click(screen.getByText('app.settings'))
      expect(screen.getByTestId('settings-view')).toBeInTheDocument()

      fireEvent.click(screen.getByText('app.resumes'))
      expect(screen.getByTestId('resumes-view')).toBeInTheDocument()
      expect(screen.queryByTestId('settings-view')).not.toBeInTheDocument()
    })
  })

  describe('button styling', () => {
    it('applies active styling to the active button and no active styling to inactive buttons', async (): Promise<void> => {
      await renderApp()
      const resumesBtn = screen.getByText('app.resumes')
      const profileBtn = screen.getByText('app.profile')
      const settingsBtn = screen.getByText('app.settings')

      // Default: Resumes is active
      expect(resumesBtn.closest('button')).toHaveClass('bg-primary/10')
      expect(profileBtn.closest('button')).not.toHaveClass('bg-primary/10')
      expect(settingsBtn.closest('button')).not.toHaveClass('bg-primary/10')
    })

    it('updates button styling when switching views', async (): Promise<void> => {
      await renderApp()
      fireEvent.click(screen.getByText('app.profile'))

      const resumesBtn = screen.getByText('app.resumes')
      const profileBtn = screen.getByText('app.profile')

      expect(profileBtn.closest('button')).toHaveClass('bg-primary/10')
      expect(resumesBtn.closest('button')).not.toHaveClass('bg-primary/10')
    })
  })
})
