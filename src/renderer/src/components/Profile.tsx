import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { toast } from 'sonner'

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

  useEffect(() => {
    const loadProfile = async (): Promise<void> => {
      try {
        const data = await window.electron.ipcRenderer.invoke('profile:load')
        if (data && Object.keys(data).length > 0) {
          setProfile(data)
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleSave = async (): Promise<void> => {
    try {
      const result = await window.electron.ipcRenderer.invoke('profile:save', profile)
      if (result.success) {
        toast.success('Profile saved successfully')
      } else {
        toast.error('Failed to save profile: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      toast.error('Failed to save profile')
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
        { id: Date.now().toString(), company: '', role: '', date: '', description: '' }
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
    return <div className="p-6">Loading profile...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Profile Management</h2>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your contact details and professional summary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={profile.personalInfo.name}
                onChange={(e) => updatePersonalInfo('name', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={profile.personalInfo.email}
                onChange={(e) => updatePersonalInfo('email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={profile.personalInfo.phone}
                onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Professional Summary</label>
            <Textarea
              value={profile.personalInfo.summary}
              onChange={(e) => updatePersonalInfo('summary', e.target.value)}
              placeholder="Brief summary of your professional background..."
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Work Experience */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Work Experience</CardTitle>
            <CardDescription>Your past roles and achievements.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addWorkExperience}>
            Add Experience
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
                Remove
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company</label>
                  <Input
                    value={exp.company}
                    onChange={(e) => updateWorkExperience(exp.id, 'company', e.target.value)}
                    placeholder="Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Input
                    value={exp.role}
                    onChange={(e) => updateWorkExperience(exp.id, 'role', e.target.value)}
                    placeholder="Job Title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Input
                    value={exp.date}
                    onChange={(e) => updateWorkExperience(exp.id, 'date', e.target.value)}
                    placeholder="e.g. Jan 2020 - Present"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={exp.description}
                  onChange={(e) => updateWorkExperience(exp.id, 'description', e.target.value)}
                  placeholder="Describe your responsibilities and achievements..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          ))}
          {profile.workExperience.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No work experience added yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Notable projects you've worked on.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addProject}>
            Add Project
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
                Remove
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Name</label>
                  <Input
                    value={proj.name}
                    onChange={(e) => updateProject(proj.id, 'name', e.target.value)}
                    placeholder="Project Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tech Stack</label>
                  <Input
                    value={proj.techStack}
                    onChange={(e) => updateProject(proj.id, 'techStack', e.target.value)}
                    placeholder="React, TypeScript, Node.js"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={proj.description}
                  onChange={(e) => updateProject(proj.id, 'description', e.target.value)}
                  placeholder="Describe the project and your contribution..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          ))}
          {profile.projects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No projects added yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
