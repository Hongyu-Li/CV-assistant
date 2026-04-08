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

describe('Mobile sidebar', () => {
  it('shows hamburger button by default', async (): Promise<void> => {
    await renderApp()
    expect(screen.getByLabelText('a11y.toggle_sidebar')).toBeInTheDocument()
  })

  it('opens sidebar and shows backdrop when hamburger is clicked', async (): Promise<void> => {
    await renderApp()
    const sidebar = screen.getByLabelText('a11y.sidebar_nav')
    expect(sidebar).toHaveClass('-translate-x-full')

    fireEvent.click(screen.getByLabelText('a11y.toggle_sidebar'))

    expect(sidebar).toHaveClass('translate-x-0')
    expect(sidebar).not.toHaveClass('-translate-x-full')
  })

  it('hides hamburger button when sidebar is open', async (): Promise<void> => {
    await renderApp()
    fireEvent.click(screen.getByLabelText('a11y.toggle_sidebar'))

    expect(screen.queryByLabelText('a11y.toggle_sidebar')).not.toBeInTheDocument()
  })

  it('closes sidebar when close button is clicked', async (): Promise<void> => {
    await renderApp()
    fireEvent.click(screen.getByLabelText('a11y.toggle_sidebar'))

    const sidebar = screen.getByLabelText('a11y.sidebar_nav')
    expect(sidebar).toHaveClass('translate-x-0')

    fireEvent.click(screen.getByLabelText('a11y.close_sidebar'))

    expect(sidebar).toHaveClass('-translate-x-full')
  })

  it('closes sidebar when backdrop is clicked', async (): Promise<void> => {
    await renderApp()
    fireEvent.click(screen.getByLabelText('a11y.toggle_sidebar'))

    const sidebar = screen.getByLabelText('a11y.sidebar_nav')
    expect(sidebar).toHaveClass('translate-x-0')

    const backdrop = sidebar.previousElementSibling as HTMLElement
    fireEvent.click(backdrop)

    expect(sidebar).toHaveClass('-translate-x-full')
  })

  it('closes sidebar when a nav item is clicked', async (): Promise<void> => {
    await renderApp()
    fireEvent.click(screen.getByLabelText('a11y.toggle_sidebar'))

    const sidebar = screen.getByLabelText('a11y.sidebar_nav')
    expect(sidebar).toHaveClass('translate-x-0')

    fireEvent.click(screen.getByText('app.profile'))

    expect(sidebar).toHaveClass('-translate-x-full')
    expect(screen.getByTestId('profile-view')).toBeInTheDocument()
  })
})

describe('Sidebar collapse (desktop)', () => {
  it('renders collapse button', async (): Promise<void> => {
    await renderApp()
    expect(screen.getByLabelText('a11y.collapse_sidebar')).toBeInTheDocument()
  })

  it('collapses sidebar when collapse button is clicked', async (): Promise<void> => {
    await renderApp()
    const sidebar = screen.getByLabelText('a11y.sidebar_nav')
    expect(sidebar).toHaveClass('md:w-64')

    fireEvent.click(screen.getByLabelText('a11y.collapse_sidebar'))

    expect(sidebar).toHaveClass('md:w-14')
    expect(sidebar).not.toHaveClass('md:w-64')
  })

  it('shows expand button after collapsing', async (): Promise<void> => {
    await renderApp()
    fireEvent.click(screen.getByLabelText('a11y.collapse_sidebar'))

    expect(screen.queryByLabelText('a11y.collapse_sidebar')).not.toBeInTheDocument()
    expect(screen.getByLabelText('a11y.expand_sidebar')).toBeInTheDocument()
  })

  it('expands sidebar back when expand button is clicked', async (): Promise<void> => {
    await renderApp()
    fireEvent.click(screen.getByLabelText('a11y.collapse_sidebar'))

    const sidebar = screen.getByLabelText('a11y.sidebar_nav')
    expect(sidebar).toHaveClass('md:w-14')

    fireEvent.click(screen.getByLabelText('a11y.expand_sidebar'))

    expect(sidebar).toHaveClass('md:w-64')
    expect(sidebar).not.toHaveClass('md:w-14')
  })

  it('adds title tooltip to nav buttons when collapsed', async (): Promise<void> => {
    await renderApp()
    const profileBtn = screen.getByText('app.profile').closest('button') as HTMLElement
    expect(profileBtn).not.toHaveAttribute('title')

    fireEvent.click(screen.getByLabelText('a11y.collapse_sidebar'))

    expect(profileBtn).toHaveAttribute('title', 'app.profile')
  })

  it('removes title tooltip when expanded again', async (): Promise<void> => {
    await renderApp()
    fireEvent.click(screen.getByLabelText('a11y.collapse_sidebar'))

    const profileBtn = screen.getByText('app.profile').closest('button') as HTMLElement
    expect(profileBtn).toHaveAttribute('title', 'app.profile')

    fireEvent.click(screen.getByLabelText('a11y.expand_sidebar'))

    expect(profileBtn).not.toHaveAttribute('title')
  })

  it('hides nav label text visually when collapsed', async (): Promise<void> => {
    await renderApp()
    fireEvent.click(screen.getByLabelText('a11y.collapse_sidebar'))

    const labelSpan = screen.getByText('app.resumes')
    expect(labelSpan).toHaveClass('md:sr-only')
  })

  it('sidebar collapse button meets minimum touch target size', async (): Promise<void> => {
    await renderApp()
    const collapseBtn = screen.getByLabelText('a11y.collapse_sidebar')
    expect(collapseBtn).toHaveClass('h-9')
    expect(collapseBtn).toHaveClass('w-9')
  })
})
