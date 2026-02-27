import { Toaster } from './components/ui/sonner'
import { Button } from './components/ui/button'

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
        <div className="font-semibold text-lg">{t('app.title')}</div>
        <nav className="flex flex-col gap-2">
          <Button
            variant={currentView === 'resumes' ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={(): void => setCurrentView('resumes')}
          >
            {t('app.resumes')}
          </Button>
          <Button
            variant={currentView === 'profile' ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={(): void => setCurrentView('profile')}
          >
            {t('app.profile')}
          </Button>
          <Button
            variant={currentView === 'settings' ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={(): void => setCurrentView('settings')}
          >
            {t('app.settings')}
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {currentView === 'resumes' && <Resumes />}
        {currentView === 'profile' && <Profile />}
        {currentView === 'settings' && <Settings />}
      </main>
      <Toaster />
    </div>
  )
}

export default App
