import { Toaster } from './components/ui/sonner'
import { Button } from './components/ui/button'

import {
  FileText,
  User,
  Settings as SettingsIcon,
  Sparkles,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { Resumes } from './pages/Resumes'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useTranslation } from 'react-i18next'

type View = 'profile' | 'settings' | 'resumes'

const NAV_ITEMS: { view: View; icon: typeof User; labelKey: string }[] = [
  { view: 'profile', icon: User, labelKey: 'app.profile' },
  { view: 'resumes', icon: FileText, labelKey: 'app.resumes' },
  { view: 'settings', icon: SettingsIcon, labelKey: 'app.settings' }
]

function App(): React.JSX.Element {
  const { t } = useTranslation()
  const [currentView, setCurrentView] = useState<View>('resumes')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    document.title = t('app.title')
  }, [t])

  const handleNavClick = useCallback((view: View): void => {
    setCurrentView(view)
    setSidebarOpen(false)
  }, [])

  const isActive = (view: View): boolean => currentView === view

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-3 z-50 md:hidden"
          onClick={(): void => setSidebarOpen(true)}
          aria-label={t('a11y.toggle_sidebar')}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-sidebar-backdrop-in"
          onClick={(): void => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label={t('a11y.sidebar_nav')}
        className={[
          'fixed inset-y-0 left-0 z-50 border-r border-border flex flex-col transition-all duration-200 ease-out',
          'bg-background',
          sidebarOpen ? 'w-64 translate-x-0 animate-sidebar-slide-in' : '-translate-x-full w-64',
          'md:static md:translate-x-0',
          sidebarCollapsed ? 'md:w-14 md:px-1.5 md:py-4' : 'md:w-64 md:p-4'
        ].join(' ')}
      >
        <div
          className={[
            'flex items-center p-4 md:p-0',
            sidebarCollapsed ? 'md:justify-center md:mb-3' : 'justify-between md:mb-4'
          ].join(' ')}
        >
          <div
            className={[
              'flex items-center gap-2 px-2 py-1',
              sidebarCollapsed ? 'md:px-0' : ''
            ].join(' ')}
          >
            <Sparkles
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-primary animate-green-glow"
            />
            <span
              className={`font-medium text-lg whitespace-nowrap ${sidebarCollapsed ? 'md:hidden' : ''}`}
            >
              {t('app.title')}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={(): void => setSidebarOpen(false)}
            aria-label={t('a11y.close_sidebar')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className={`h-px bg-border ${sidebarCollapsed ? 'md:mx-1' : 'mx-4 md:mx-0'}`} />

        <nav
          className={[
            'flex flex-col gap-1 p-4 md:p-0',
            sidebarCollapsed ? 'md:items-center md:mt-3' : 'md:mt-4'
          ].join(' ')}
        >
          {NAV_ITEMS.map(({ view, icon: Icon, labelKey }) => (
            <Button
              key={view}
              variant="ghost"
              size={sidebarCollapsed ? 'icon' : 'default'}
              className={[
                'transition-all duration-200',
                sidebarCollapsed
                  ? [
                      'md:h-9 md:w-9 md:rounded-lg',
                      isActive(view)
                        ? 'md:bg-primary/10 md:text-primary md:border md:border-primary/40'
                        : 'md:text-muted-foreground md:hover:text-accent-foreground'
                    ].join(' ')
                  : [
                      'justify-start gap-2 w-full',
                      isActive(view)
                        ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                        : 'text-muted-foreground hover:text-accent-foreground'
                    ].join(' ')
              ].join(' ')}
              onClick={(): void => handleNavClick(view)}
              aria-current={isActive(view) ? 'page' : undefined}
              title={sidebarCollapsed ? t(labelKey) : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={sidebarCollapsed ? 'md:sr-only' : ''}>{t(labelKey)}</span>
            </Button>
          ))}
        </nav>

        <div
          className={[
            'mt-auto hidden md:flex',
            sidebarCollapsed ? 'justify-center pb-2' : 'px-0 pb-0'
          ].join(' ')}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-accent-foreground"
            onClick={(): void => setSidebarCollapsed((prev) => !prev)}
            aria-label={sidebarCollapsed ? t('a11y.expand_sidebar') : t('a11y.collapse_sidebar')}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      <main className="flex-1 pt-14 px-3 pb-3 md:p-6 overflow-auto @container/main">
        <h1 className="sr-only">{t('app.title')}</h1>
        <ErrorBoundary>
          <div key={currentView} className="animate-page-enter">
            {currentView === 'resumes' && <Resumes />}
            {currentView === 'profile' && <Profile />}
            {currentView === 'settings' && <Settings />}
          </div>
        </ErrorBoundary>
      </main>
      <Toaster />
    </div>
  )
}

export default App
