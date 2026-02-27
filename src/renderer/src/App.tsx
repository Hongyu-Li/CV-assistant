import { Toaster } from './components/ui/sonner'
import { Button } from './components/ui/button'

import { FileText, User, Settings as SettingsIcon, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Profile } from './components/Profile'
import { Settings } from './components/Settings'
import { Resumes } from './components/Resumes'
import { useTranslation } from 'react-i18next'

function App(): React.JSX.Element {
  const { t } = useTranslation()
  const [currentView, setCurrentView] = useState<'profile' | 'settings' | 'resumes'>('resumes')

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/40 p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 px-2 py-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">{t('app.title')}</span>
        </div>
        <div className="h-px bg-border" />
        <nav className="flex flex-col gap-2">
          <Button
            variant="ghost"
            className={`justify-start gap-2 transition-all duration-200 ${currentView === 'resumes' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''}`}
            onClick={(): void => setCurrentView('resumes')}
          >
            <FileText className="h-4 w-4" />
            {t('app.resumes')}
          </Button>
          <Button
            variant="ghost"
            className={`justify-start gap-2 transition-all duration-200 ${currentView === 'profile' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''}`}
            onClick={(): void => setCurrentView('profile')}
          >
            <User className="h-4 w-4" />
            {t('app.profile')}
          </Button>
          <Button
            variant="ghost"
            className={`justify-start gap-2 transition-all duration-200 ${currentView === 'settings' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''}`}
            onClick={(): void => setCurrentView('settings')}
          >
            <SettingsIcon className="h-4 w-4" />
            {t('app.settings')}
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div key={currentView} className="animate-page-enter">
          {currentView === 'resumes' && <Resumes />}
          {currentView === 'profile' && <Profile />}
          {currentView === 'settings' && <Settings />}
        </div>
      </main>
      <Toaster />
    </div>
  )
}

export default App
