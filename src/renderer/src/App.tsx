import { Toaster } from './components/ui/sonner'
import { Button } from './components/ui/button'

import { FileText, User, Settings as SettingsIcon, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { Resumes } from './pages/Resumes'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useTranslation } from 'react-i18next'

function App(): React.JSX.Element {
  const { t } = useTranslation()
  const [currentView, setCurrentView] = useState<'profile' | 'settings' | 'resumes'>('resumes')

  useEffect(() => {
    document.title = t('app.title')
  }, [t])

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        aria-label={t('a11y.sidebar_nav')}
        className="w-64 border-r bg-muted/40 p-4 flex flex-col gap-4"
      >
        <div className="flex items-center gap-2 px-2 py-1">
          <Sparkles aria-hidden="true" className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">{t('app.title')}</span>
        </div>
        <div className="h-px bg-border" />
        <nav className="flex flex-col gap-2">
          <Button
            variant="ghost"
            className={`justify-start gap-2 transition-all duration-200 ${currentView === 'profile' ? 'bg-primary/15 text-primary font-medium border-l-2 border-primary' : ''}`}
            onClick={(): void => setCurrentView('profile')}
            aria-current={currentView === 'profile' ? 'page' : undefined}
          >
            <User className="h-4 w-4" />
            {t('app.profile')}
          </Button>
          <Button
            variant="ghost"
            className={`justify-start gap-2 transition-all duration-200 ${currentView === 'resumes' ? 'bg-primary/15 text-primary font-medium border-l-2 border-primary' : ''}`}
            onClick={(): void => setCurrentView('resumes')}
            aria-current={currentView === 'resumes' ? 'page' : undefined}
          >
            <FileText className="h-4 w-4" />
            {t('app.resumes')}
          </Button>
          <Button
            variant="ghost"
            className={`justify-start gap-2 transition-all duration-200 ${currentView === 'settings' ? 'bg-primary/15 text-primary font-medium border-l-2 border-primary' : ''}`}
            onClick={(): void => setCurrentView('settings')}
            aria-current={currentView === 'settings' ? 'page' : undefined}
          >
            <SettingsIcon className="h-4 w-4" />
            {t('app.settings')}
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
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
