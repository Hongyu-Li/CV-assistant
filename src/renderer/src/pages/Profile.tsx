import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { Button } from '../components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSettings } from '../context/SettingsContext'
import { extractProfileFromPdf } from '../lib/provider'
import { PROVIDER_CONFIGS } from '../lib/provider'
import { toErrorMessage } from '../lib/utils'
import { ConfirmDialog } from '../components/ConfirmDialog'

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

interface Education {
  id: string
  school: string
  degree: string
  date: string
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
  education: Education[]
}

const initialProfile: ProfileData = {
  personalInfo: {
    name: '',
    email: '',
    phone: '',
    summary: ''
  },
  workExperience: [],
  projects: [],
  education: []
}

export function Profile(): React.JSX.Element {
  const [profile, setProfile] = useState<ProfileData>(initialProfile)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const { t } = useTranslation()
  const { settings } = useSettings()
  const loadedRef = useRef(false)
  const skipNextSaveRef = useRef(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'education' | 'workExperience' | 'project'
    id: string
  } | null>(null)

  const autoSave = useCallback(
    async (data: ProfileData): Promise<void> => {
      try {
        const result = await window.electron.ipcRenderer.invoke(
          'profile:save',
          data,
          settings.workspacePath
        )
        if (!result.success) {
          toast.error(t('profile.save_error') + result.error)
        }
      } catch (error) {
        console.error('Failed to save profile:', error)
        toast.error(t('profile.save_error'))
      }
    },
    [settings.workspacePath, t]
  )

  useEffect(() => {
    let cancelled = false
    const loadProfile = async (): Promise<void> => {
      try {
        const data = await window.electron.ipcRenderer.invoke(
          'profile:load',
          settings.workspacePath
        )
        if (cancelled) return
        if (data && Object.keys(data).length > 0) {
          // Mark that the next profile change comes from loading, not user input
          skipNextSaveRef.current = true
          setProfile(data)
        }
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load profile:', error)
        toast.error(t('profile.load_error'))
      } finally {
        if (!cancelled) {
          setLoading(false)
          loadedRef.current = true
        }
      }
    }
    loadProfile()
    return (): void => {
      cancelled = true
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [t, settings.workspacePath])

  // Debounced auto-save: triggers 500ms after any profile state change, skips initial load
  useEffect(() => {
    if (!loadedRef.current) return

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      void autoSave(profile)
    }, 500)

    return (): void => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [profile, autoSave])

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
    setItemToDelete({ type: 'workExperience', id })
    setConfirmDeleteOpen(true)
  }

  const removeProject = (id: string): void => {
    setItemToDelete({ type: 'project', id })
    setConfirmDeleteOpen(true)
  }

  const removeEducation = (id: string): void => {
    setItemToDelete({ type: 'education', id })
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = (): void => {
    if (!itemToDelete) return

    const { type, id } = itemToDelete
    switch (type) {
      case 'workExperience':
        setProfile((prev) => ({
          ...prev,
          workExperience: prev.workExperience.filter((exp) => exp.id !== id)
        }))
        break
      case 'project':
        setProfile((prev) => ({
          ...prev,
          projects: prev.projects.filter((proj) => proj.id !== id)
        }))
        break
      case 'education':
        setProfile((prev) => ({
          ...prev,
          education: prev.education.filter((edu) => edu.id !== id)
        }))
        break
    }
    setConfirmDeleteOpen(false)
    setItemToDelete(null)
  }

  const addProject = (): void => {
    setProfile((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        { id: crypto.randomUUID(), name: '', techStack: '', description: '' }
      ]
    }))
  }

  const updateProject = (id: string, field: keyof Project, value: string): void => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.map((proj) => (proj.id === id ? { ...proj, [field]: value } : proj))
    }))
  }

  const addEducation = (): void => {
    setProfile((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { id: crypto.randomUUID(), school: '', degree: '', date: '', description: '' }
      ]
    }))
  }

  const updateEducation = (id: string, field: keyof Education, value: string): void => {
    setProfile((prev) => ({
      ...prev,
      education: prev.education.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu))
    }))
  }

  const handleImportPdf = async (): Promise<void> => {
    const apiKey = settings.apiKeys?.[settings.provider] || ''
    if (!settings.provider || !apiKey) {
      toast.error(t('profile.import_no_ai'))
      return
    }

    setImporting(true)
    try {
      const pdfResult = await window.electron.ipcRenderer.invoke('profile:extractPdfText')
      if (pdfResult === null) return
      if (!pdfResult.success) {
        toast.error(t('profile.import_error') + pdfResult.error)
        return
      }

      const config = PROVIDER_CONFIGS[settings.provider]
      const extracted = await extractProfileFromPdf({
        pdfText: pdfResult.text,
        provider: settings.provider,
        apiKey,
        model: settings.model || config.defaultModel,
        baseUrl: settings.baseUrl || ''
      })

      setProfile({
        personalInfo: extracted.personalInfo,
        workExperience: extracted.workExperience.map((exp) => ({
          ...exp,
          id: crypto.randomUUID()
        })),
        projects: extracted.projects.map((proj) => ({
          ...proj,
          id: crypto.randomUUID()
        })),
        education: extracted.education.map((edu) => ({
          ...edu,
          id: crypto.randomUUID()
        }))
      })

      toast.success(t('profile.import_success'))
    } catch (error) {
      console.error('Failed to import PDF:', error)
      toast.error(t('profile.import_error') + toErrorMessage(error))
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-10 animate-page-enter">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 rounded-lg animate-shimmer" />
          <div className="h-10 w-32 rounded-lg animate-shimmer" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-xl animate-shimmer" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 animate-page-enter">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">{t('profile.title')}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportPdf} disabled={importing}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {importing ? t('profile.importing') : t('profile.import_pdf')}
          </Button>
        </div>
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

      {/* Education */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('profile.education')}</CardTitle>
            <CardDescription>{t('profile.education_desc')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addEducation}>
            {t('profile.add_education')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {profile.education.map((edu) => (
            <div
              key={edu.id}
              className="grid gap-4 p-4 pt-8 border rounded-lg relative bg-muted/20"
            >
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                onClick={() => removeEducation(edu.id)}
              >
                {t('profile.remove')}
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.school')}</label>
                  <Input
                    value={edu.school}
                    onChange={(e) => updateEducation(edu.id, 'school', e.target.value)}
                    placeholder={t('profile.school_ph')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.degree')}</label>
                  <Input
                    value={edu.degree}
                    onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                    placeholder={t('profile.degree_ph')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.date_range')}</label>
                  <Input
                    value={edu.date}
                    onChange={(e) => updateEducation(edu.id, 'date', e.target.value)}
                    placeholder={t('profile.date_range_ph')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('profile.description')}</label>
                <MarkdownEditor
                  value={edu.description}
                  onChange={(val) => updateEducation(edu.id, 'description', val)}
                  placeholder={t('profile.education_description_ph')}
                  minHeight="80px"
                />
              </div>
            </div>
          ))}
          {profile.education.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t('profile.no_education')}
            </div>
          )}
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
            <div
              key={exp.id}
              className="grid gap-4 p-4 pt-8 border rounded-lg relative bg-muted/20"
            >
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
            <div
              key={proj.id}
              className="grid gap-4 p-4 pt-8 border rounded-lg relative bg-muted/20"
            >
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

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t('profile.delete_confirm_title')}
        description={t('profile.delete_confirm_desc')}
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  )
}
