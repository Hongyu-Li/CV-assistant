export interface ProfilePersonalInfoSaveData {
  name?: string
  email?: string
  phone?: string
  summary?: string
}

export interface ProfileWorkExperienceSaveData {
  id: string
  company: string
  role: string
  date: string
  description: string
}

export interface ProfileProjectSaveData {
  id: string
  name: string
  techStack: string
  description: string
}

export interface ProfileEducationSaveData {
  id: string
  school: string
  degree: string
  date: string
  description: string
}

export interface ProfileSaveData {
  personalInfo?: ProfilePersonalInfoSaveData
  workExperience?: ProfileWorkExperienceSaveData[]
  projects?: ProfileProjectSaveData[]
  education?: ProfileEducationSaveData[]
}

export interface ProfileLoadPersonalInfo {
  name: string
  email: string
  phone: string
  summary: string
}

export interface ProfileLoadWorkExperience {
  id: string
  company: string
  role: string
  date: string
  description: string
}

export interface ProfileLoadProject {
  id: string
  name: string
  techStack: string
  description: string
}

export interface ProfileLoadEducation {
  id: string
  school: string
  degree: string
  date: string
  description: string
}

export interface ProfileLoadResult {
  personalInfo: ProfileLoadPersonalInfo
  workExperience: ProfileLoadWorkExperience[]
  projects: ProfileLoadProject[]
  education: ProfileLoadEducation[]
}

export interface CvSaveData {
  mdFile?: string
  generatedCV?: string
  [key: string]: unknown
}

export interface AiChatMessage {
  role: string
  content: string
}

export interface IpcSuccessResponse {
  success: true
}

export interface IpcErrorResponse {
  success: false
  error: string
}

export type IpcResult<T> = ({ success: true } & T) | IpcErrorResponse

export interface DialogDeps {
  dialog: typeof import('electron').dialog
}

export interface ShellOpenPathDeps {
  shell: typeof import('electron').shell
  app: typeof import('electron').app
}

export interface AppDeps {
  app: typeof import('electron').app
}
