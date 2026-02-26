import { Toaster } from './components/ui/sonner'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Textarea } from './components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './components/ui/select'
import { toast } from 'sonner'

import { useState } from 'react'
import { Profile } from './components/Profile'
import { Settings } from './components/Settings'
import { Generator } from './components/Generator'
import { useTranslation } from 'react-i18next'
function App(): React.JSX.Element {
  const { t } = useTranslation()
  const [currentView, setCurrentView] = useState<
    'dashboard' | 'profile' | 'settings' | 'generator'
  >('dashboard')

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/40 p-4 flex flex-col gap-4">
        <div className="font-semibold text-lg">{t('app.title')}</div>
        <nav className="flex flex-col gap-2">
          <Button
            variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={() => setCurrentView('dashboard')}
          >
            {t('app.dashboard')}
          </Button>
          <Button
            variant={currentView === 'profile' ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={() => setCurrentView('profile')}
          >
            {t('app.profile')}
          </Button>
          <Button
            variant={currentView === 'generator' ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={() => setCurrentView('generator')}
          >
            {t('app.generator')}
          </Button>
          <Button variant="ghost" className="justify-start">
            {t('app.resumes')}
          </Button>
          <Button
            variant={currentView === 'settings' ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={() => setCurrentView('settings')}
          >
            {t('app.settings')}
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {currentView === 'profile' && <Profile />}
        {currentView === 'settings' && <Settings />}
        {currentView === 'generator' && <Generator />}
        {currentView === 'dashboard' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('dashboard.create_cv_title')}</CardTitle>
                  <CardDescription>{t('dashboard.create_cv_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('dashboard.job_title')}</label>
                    <Input placeholder={t('dashboard.job_title_ph')} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('dashboard.exp_level')}</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={t('dashboard.exp_level_ph')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">{t('dashboard.level_junior')}</SelectItem>
                        <SelectItem value="mid">{t('dashboard.level_mid')}</SelectItem>
                        <SelectItem value="senior">{t('dashboard.level_senior')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      toast(t('dashboard.draft_created'))
                      setCurrentView('generator')
                    }}
                  >
                    {t('dashboard.create_draft')}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('dashboard.quick_notes_title')}</CardTitle>
                  <CardDescription>{t('dashboard.quick_notes_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea placeholder={t('dashboard.quick_notes_ph')} className="min-h-[120px]" />
                  <Button variant="secondary" onClick={() => toast(t('dashboard.notes_saved'))}>
                    {t('dashboard.save_notes')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
      <Toaster />
    </div>
  )
}

export default App
