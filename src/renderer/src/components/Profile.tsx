import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { MarkdownEditor } from './MarkdownEditor'
import { Button } from './ui/button'
import { toast } from 'sonner'
import { useSettings } from '../context/SettingsContext'
import { Upload } from 'lucide-react'

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
  const [importing, setImporting] = useState(false)
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

  const handleImportClick = async (): Promise<void> => {
    let parsingToast: string | number | undefined
    try {
      // Use Electron dialog to select file
      const result = await window.electron.ipcRenderer.invoke('dialog:openFile', {
        filters: [
          { name: 'Resume Files', extensions: ['pdf', 'docx', 'md', 'txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!result || result.canceled || !result.filePaths?.[0]) {
        return
      }

      const filePath = result.filePaths[0]

      setImporting(true)

      // Request main process to parse the file
      const parseResult = await window.electron.ipcRenderer.invoke('profile:parseFile', filePath)

      if (!parseResult.success) {
        toast.error(t('profile.import_error') + parseResult.error)
        setImporting(false)
        return
      }

      // Parse with AI - show loading toast
      parsingToast = toast.loading(t('profile.importing'))
      const parsed = await parseResumeWithAI(parseResult.text)
      console.log('Parsed result:', parsed)

      // Transform parsed data to match ProfileData structure with IDs
      const newProfile: ProfileData = {
        personalInfo: {
          name: parsed.personalInfo?.name || '',
          email: parsed.personalInfo?.email || '',
          phone: parsed.personalInfo?.phone || '',
          summary: parsed.personalInfo?.summary || ''
        },
        workExperience: (parsed.workExperience || []).map((exp) => ({
          id: crypto.randomUUID(),
          company: exp.company || '',
          role: exp.role || '',
          date: exp.date || '',
          description: exp.description || ''
        })),
        projects: (parsed.projects || []).map((proj) => ({
          id: crypto.randomUUID(),
          name: proj.name || '',
          techStack: proj.techStack || '',
          description: proj.description || ''
        }))
      }

      console.log('New profile to set:', newProfile)
      setProfile(newProfile)

      // Check if we got any data
      const hasData = newProfile.personalInfo.name || newProfile.workExperience.length > 0
      if (hasData) {
        toast.success(t('profile.save_success'))
      } else {
        toast.warning('Resume parsed but no data was extracted. Please fill in manually.')
      }
    } catch (error) {
      console.error('Failed to import resume:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(t('profile.import_error') + errorMessage)
    } finally {
      // Ensure loading toast is always closed
      if (parsingToast !== undefined) {
        toast.dismiss(parsingToast)
      }
      setImporting(false)
    }
  }

  const parseResumeWithAI = async (text: string): Promise<Partial<ProfileData>> => {
    // Check if API key is configured
    const apiKey = settings.apiKeys?.[settings.provider]
    if (!apiKey && settings.provider !== 'ollama') {
      throw new Error(`API key not found for ${settings.provider}. Please configure it in Settings.`)
    }

    const systemPrompt = `你是一个简历解析助手。从简历文本中提取结构化信息，并返回 JSON 对象。

必须返回以下格式的 JSON：
{
  "personalInfo": { "name": "姓名", "email": "邮箱", "phone": "电话", "summary": "个人简介" },
  "workExperience": [{ "company": "公司名", "role": "职位", "date": "时间段", "description": "工作描述" }],
  "projects": [{ "name": "项目名称", "techStack": "技术栈", "description": "项目描述" }]
}

规则：
1. 只返回 JSON 对象，不要 markdown 代码块，不要解释说明
2. 如果没找到信息，使用空字符串或空数组
3. 时间格式如 "2020年1月 - 至今" 或 "2020 - 2022"
4. 提取所有工作经历
5. 提取重要项目及其技术栈`

    // Limit text length to avoid timeout - focus on first part of resume which usually contains key info
    const limitedText = text.substring(0, 5000)
    console.log('Sending text to AI, length:', limitedText.length)
    const userPrompt = `请解析以下简历并返回结构化JSON数据：\n\n${limitedText}`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    console.log('Calling AI with provider:', settings.provider)
    console.log('Model:', settings.model)

    const result = await window.electron.ipcRenderer.invoke('ai:chat', {
      provider: settings.provider,
      apiKey: apiKey || '',
      model: settings.model,
      messages,
      baseUrl: settings.baseUrl
    })

    console.log('AI result:', result)

    if (!result.success) {
      throw new Error('AI parsing failed: ' + result.error)
    }

    const content = result.content as string
    console.log('AI response content:', content)
    console.log('Content length:', content.length)

    // Try multiple strategies to extract JSON
    let jsonStr = ''

    // Strategy 1: Look for JSON code block with json tag
    const jsonCodeBlockMatch = content.match(/```json\s*([\s\S]*?)```/)
    if (jsonCodeBlockMatch) {
      jsonStr = jsonCodeBlockMatch[1].trim()
      console.log('Found JSON code block with json tag')
    }

    // Strategy 2: Look for any code block
    if (!jsonStr) {
      const codeBlockMatch = content.match(/```\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim()
        console.log('Found generic code block')
      }
    }

    // Strategy 3: Look for JSON object between curly braces (greedy match from first { to last })
    if (!jsonStr) {
      const firstBrace = content.indexOf('{')
      const lastBrace = content.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = content.substring(firstBrace, lastBrace + 1).trim()
        console.log('Found JSON between braces')
      }
    }

    // Strategy 4: Use the entire content
    if (!jsonStr) {
      jsonStr = content.trim()
      console.log('Using entire content')
    }

    console.log('Extracted JSON string (first 1000 chars):', jsonStr.substring(0, 1000))

    // Clean the JSON string - remove BOM, control characters, and normalize whitespace
    const cleanedJsonStr = jsonStr
      .replace(/^\uFEFF/, '') // Remove BOM
      .replace(/^[\s\u200B-\u200D\uFEFF]+/, '') // Remove leading zero-width spaces
      .replace(/[\s\u200B-\u200D\uFEFF]+$/, '') // Remove trailing zero-width spaces

    try {
      const parsed = JSON.parse(cleanedJsonStr) as Partial<ProfileData>
      console.log('Successfully parsed JSON:', JSON.stringify(parsed, null, 2))

      // Validate structure
      if (!parsed.personalInfo && !parsed.workExperience && !parsed.projects) {
        console.warn('Parsed JSON is missing expected fields')
      }

      return parsed
    } catch (parseError) {
      console.error('JSON parse error:', parseError)

      // Smart JSON repair for truncated responses
      let fixedJson = cleanedJsonStr

      console.log('Attempting to repair truncated JSON...')
      console.log('JSON length:', fixedJson.length)
      console.log('Last 200 chars:', fixedJson.slice(-200))

      // Find key structural positions
      const personalInfoMatch = fixedJson.match(/"personalInfo"\s*:\s*\{/)
      const workExpMatch = fixedJson.match(/"workExperience"\s*:\s*\[/)
      const projectsMatch = fixedJson.match(/"projects"\s*:\s*\[/)

      console.log('Structure found - personalInfo:', !!personalInfoMatch, 'workExperience:', !!workExpMatch, 'projects:', !!projectsMatch)

      // Strategy: Build a valid JSON from what we have
      // Start with a base structure
      const extractedData: Partial<ProfileData> = {
        personalInfo: { name: '', email: '', phone: '', summary: '' },
        workExperience: [],
        projects: []
      }

      try {
        // Try to extract personal info with regex
        const nameMatch = fixedJson.match(/"name"\s*:\s*"([^"]*)"/)
        const emailMatch = fixedJson.match(/"email"\s*:\s*"([^"]*)"/)
        const phoneMatch = fixedJson.match(/"phone"\s*:\s*"([^"]*)"/)
        const summaryMatch = fixedJson.match(/"summary"\s*:\s*"([^"]*)"/)

        if (nameMatch) extractedData.personalInfo!.name = nameMatch[1]
        if (emailMatch) extractedData.personalInfo!.email = emailMatch[1]
        if (phoneMatch) extractedData.personalInfo!.phone = phoneMatch[1]
        if (summaryMatch) extractedData.personalInfo!.summary = summaryMatch[1]

        console.log('Extracted personal info:', extractedData.personalInfo)

        // Try to extract work experience entries
        // Look for complete work experience objects: {"company":"...","role":"...","date":"...","description":"..."}
        const workExpPattern = /\{\s*"company"\s*:\s*"([^"]*)"\s*,\s*"role"\s*:\s*"([^"]*)"\s*,\s*"date"\s*:\s*"([^"]*)"\s*,\s*"description"\s*:\s*"([^"]*)"\s*\}/g
        let workMatch
        while ((workMatch = workExpPattern.exec(fixedJson)) !== null) {
          extractedData.workExperience!.push({
            id: crypto.randomUUID(),
            company: workMatch[1],
            role: workMatch[2],
            date: workMatch[3],
            description: workMatch[4]
          })
        }

        // If regex didn't find any, try to find partial entries
        if (extractedData.workExperience!.length === 0 && workExpMatch) {
          // Find individual field matches within workExperience section
          const workSection = fixedJson.substring(workExpMatch.index!)
          const companyMatches = [...workSection.matchAll(/"company"\s*:\s*"([^"]*)"/g)]
          const roleMatches = [...workSection.matchAll(/"role"\s*:\s*"([^"]*)"/g)]
          const dateMatches = [...workSection.matchAll(/"date"\s*:\s*"([^"]*)"/g)]
          const descMatches = [...workSection.matchAll(/"description"\s*:\s*"([^"]*)"/g)]

          const entryCount = Math.min(companyMatches.length, roleMatches.length)
          for (let i = 0; i < entryCount; i++) {
            extractedData.workExperience!.push({
              id: crypto.randomUUID(),
              company: companyMatches[i]?.[1] || '',
              role: roleMatches[i]?.[1] || '',
              date: dateMatches[i]?.[1] || '',
              description: descMatches[i]?.[1] || ''
            })
          }
        }

        console.log('Extracted work experience count:', extractedData.workExperience!.length)

        // Try to extract project entries
        if (projectsMatch) {
          const projectPattern = /\{\s*"name"\s*:\s*"([^"]*)"\s*,\s*"techStack"\s*:\s*"([^"]*)"\s*,\s*"description"\s*:\s*"([^"]*)"\s*\}/g
          let projMatch
          while ((projMatch = projectPattern.exec(fixedJson)) !== null) {
            extractedData.projects!.push({
              id: crypto.randomUUID(),
              name: projMatch[1],
              techStack: projMatch[2],
              description: projMatch[3]
            })
          }
          console.log('Extracted projects count:', extractedData.projects!.length)
        }

        // Validate we got some meaningful data
        const hasData = extractedData.personalInfo!.name || extractedData.workExperience!.length > 0 || extractedData.projects!.length > 0

        if (hasData) {
          console.log('Successfully extracted structured data:', extractedData)
          if (extractedData.projects!.length === 0 && fixedJson.includes('"projects"')) {
            toast.info('Resume imported. Some project details may be truncated due to length.')
          }
          return extractedData
        }
      } catch (extractError) {
        console.error('Extraction failed:', extractError)
      }

      // Last resort: extract just personal info using simple patterns
      try {
        const nameMatch = cleanedJsonStr.match(/"name"\s*:\s*"([^"]+)"/) || cleanedJsonStr.match(/姓名[：:]\s*([^\n]+)/)
        const emailMatch = cleanedJsonStr.match(/"email"\s*:\s*"([^"]+@[^"]+)"/) || cleanedJsonStr.match(/邮箱[：:]\s*([^\s]+)/)
        const phoneMatch = cleanedJsonStr.match(/"phone"\s*:\s*"([^"]+)"/) || cleanedJsonStr.match(/电话[：:]\s*([^\s]+)/)

        if (nameMatch || emailMatch) {
          const partialData: Partial<ProfileData> = {
            personalInfo: {
              name: nameMatch?.[1]?.replace(/\\/g, '').trim() || '',
              email: emailMatch?.[1]?.replace(/\\/g, '').trim() || '',
              phone: phoneMatch?.[1]?.replace(/\\/g, '').trim() || '',
              summary: ''
            },
            workExperience: [],
            projects: []
          }
          console.log('Extracted basic info (fallback):', partialData)
          toast.info('Only basic contact info was extracted. Please add experience manually.')
          return partialData
        }
      } catch (e) {
        console.error('Basic info extraction failed:', e)
      }

      console.error('All parsing attempts failed')
      return {
        personalInfo: { name: '', email: '', phone: '', summary: '' },
        workExperience: [],
        projects: []
      }
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

  const removeProject = (id: string): void => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((proj) => proj.id !== id)
    }))
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
          <Button variant="outline" onClick={handleImportClick} disabled={importing}>
            <Upload className="h-4 w-4 mr-2" />
            {importing ? t('profile.importing') : t('profile.import_resume')}
          </Button>
          <Button onClick={handleSave}>{t('profile.save_changes')}</Button>
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
