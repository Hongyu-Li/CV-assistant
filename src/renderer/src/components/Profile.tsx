import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { MarkdownEditor } from './MarkdownEditor'
import { Button } from './ui/button'
import { toast } from 'sonner'
import { useSettings } from '../context/SettingsContext'

interface WorkExperience {
  id: string
  company: string
  role: string
  date: string
  description: string
}

interface Project {
  id: string
  name: string
  techStack: string
  description: string
}

interface ProfileData {
  personalInfo: {
    name: string
    email: string
    phone: string
    summary: string
  }
  workExperience: WorkExperience[]
  projects: Project[]
}

const initialProfile: ProfileData = {
  personalInfo: {
    name: '',
    email: '',
    phone: '',
    summary: ''
  },
  workExperience: [],
  projects: []
}

export function Profile(): React.JSX.Element {
  const [profile, setProfile] = useState<ProfileData>(initialProfile)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const { settings } = useSettings()

  useEffect(() => {
    const loadProfile = async (): Promise<void> => {
      try {
        const data = await window.electron.ipcRenderer.invoke(
          'profile:load',
          settings.workspacePath
        )
        if (data && Object.keys(data).length > 0) {
          setProfile(data)
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
        toast.error(t('profile.load_error'))
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [t, settings.workspacePath])

  const handleSave = async (): Promise<void> => {
    try {
      const result = await window.electron.ipcRenderer.invoke(
        'profile:save',
        profile,
        settings.workspacePath
      )
      if (result.success) {
        toast.success(t('profile.save_success'))
      } else {
        toast.error(t('profile.save_error') + result.error)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      toast.error(t('profile.save_error'))
    }
  }

  const updatePersonalInfo = (field: keyof ProfileData['personalInfo'], value: string): void => {
    setProfile((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }))
  }

  const addWorkExperience = (): void => {
    setProfile((prev) => ({
      ...prev,
      workExperience: [
        ...prev.workExperience,
        { id: crypto.randomUUID(), company: '', role: '', date: '', description: '' }
      ]
    }))
  }

  const updateWorkExperience = (id: string, field: keyof WorkExperience, value: string): void => {
    setProfile((prev) => ({
      ...prev,
      workExperience: prev.workExperience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }))
  }

  const removeWorkExperience = (id: string): void => {
    setProfile((prev) => ({
      ...prev,
      workExperience: prev.workExperience.filter((exp) => exp.id !== id)
    }))
  }

  const addProject = (): void => {
    setProfile((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        { id: Date.now().toString(), name: '', techStack: '', description: '' }
      ]
    }))
  }

  const updateProject = (id: string, field: keyof Project, value: string): void => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.map((proj) => (proj.id === id ? { ...proj, [field]: value } : proj))
    }))
  }

  const removeProject = (id: string): void => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((proj) => proj.id !== id)
    }))
  }

  if (loading) {
    return <div className="p-6">{t('profile.loading')}</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">{t('profile.title')}</h2>
        <Button onClick={handleSave}>{t('profile.save_changes')}</Button>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.personal_info')}</CardTitle>
          <CardDescription>{t('profile.personal_info_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('profile.full_name')}</label>
              <Input
                value={profile.personalInfo.name}
                onChange={(e) => updatePersonalInfo('name', e.target.value)}
                placeholder={t('profile.name_ph')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('profile.email')}</label>
              <Input
                value={profile.personalInfo.email}
                onChange={(e) => updatePersonalInfo('email', e.target.value)}
                placeholder={t('profile.email_ph')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('profile.phone')}</label>
              <Input
                value={profile.personalInfo.phone}
                onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                placeholder={t('profile.phone_ph')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('profile.summary')}</label>
            <MarkdownEditor
              value={profile.personalInfo.summary}
              onChange={(val) => updatePersonalInfo('summary', val)}
              placeholder={t('profile.summary_ph')}
              minHeight="100px"
            />
          </div>
        </CardContent>
      </Card>

      {/* Work Experience */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('profile.work_experience')}</CardTitle>
            <CardDescription>{t('profile.work_experience_desc')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addWorkExperience}>
            {t('profile.add_experience')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {profile.workExperience.map((exp) => (
            <div key={exp.id} className="grid gap-4 p-4 border rounded-lg relative bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                onClick={() => removeWorkExperience(exp.id)}
              >
                {t('profile.remove')}
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.company')}</label>
                  <Input
                    value={exp.company}
                    onChange={(e) => updateWorkExperience(exp.id, 'company', e.target.value)}
                    placeholder={t('profile.company_ph')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.role')}</label>
                  <Input
                    value={exp.role}
                    onChange={(e) => updateWorkExperience(exp.id, 'role', e.target.value)}
                    placeholder={t('profile.role_ph')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.date_range')}</label>
                  <Input
                    value={exp.date}
                    onChange={(e) => updateWorkExperience(exp.id, 'date', e.target.value)}
                    placeholder={t('profile.date_range_ph')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('profile.description')}</label>
                <MarkdownEditor
                  value={exp.description}
                  onChange={(val) => updateWorkExperience(exp.id, 'description', val)}
                  placeholder={t('profile.description_ph')}
                  minHeight="80px"
                />
              </div>
            </div>
          ))}
          {profile.workExperience.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t('profile.no_work_experience')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('profile.projects')}</CardTitle>
            <CardDescription>{t('profile.projects_desc')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addProject}>
            {t('profile.add_project')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {profile.projects.map((proj) => (
            <div key={proj.id} className="grid gap-4 p-4 border rounded-lg relative bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                onClick={() => removeProject(proj.id)}
              >
                {t('profile.remove')}
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.project_name')}</label>
                  <Input
                    value={proj.name}
                    onChange={(e) => updateProject(proj.id, 'name', e.target.value)}
                    placeholder={t('profile.project_name_ph')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.tech_stack')}</label>
                  <Input
                    value={proj.techStack}
                    onChange={(e) => updateProject(proj.id, 'techStack', e.target.value)}
                    placeholder={t('profile.tech_stack_ph')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('profile.description')}</label>
                <MarkdownEditor
                  value={proj.description}
                  onChange={(val) => updateProject(proj.id, 'description', val)}
                  placeholder={t('profile.project_description_ph')}
                  minHeight="80px"
                />
              </div>
            </div>
          ))}
          {profile.projects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">{t('profile.no_projects')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
