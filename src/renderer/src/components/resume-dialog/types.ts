export type InterviewStatus =
  | 'resume_sent'
  | 'first_interview'
  | 'second_interview'
  | 'third_interview'
  | 'fourth_interview'
  | 'fifth_interview'
  | 'hr_interview'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'interview_failed'

export interface InterviewRound {
  id: string
  round: 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'hr'
  date: string
  notes: string
  result: 'pending' | 'passed' | 'failed'
}

export interface CV {
  id: string
  filename: string
  jobTitle?: string
  experienceLevel?: string
  companyName?: string
  targetSalary?: string
  notes?: string
  jobDescription?: string
  generatedCV?: string
  cvLanguage?: string
  createdAt?: string
  lastModified?: string
  status?: string
  interviewStatus?: InterviewStatus
  interviewRounds?: InterviewRound[]
  keywords?: string[]
}

export interface ResumeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resume?: CV | null
  onSaved: () => void
}
