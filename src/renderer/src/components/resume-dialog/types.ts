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

/** Derive interview status from rounds */
export function deriveInterviewStatus(rounds: InterviewRound[]): InterviewStatus {
  if (rounds.length === 0) return 'resume_sent'

  // Sort by date
  const sortedRounds = [...rounds].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Find the latest round with a result
  const latestRound = sortedRounds[sortedRounds.length - 1]

  // If latest round failed, interview failed
  if (latestRound.result === 'failed') {
    return 'interview_failed'
  }

  // Map round type to status
  const roundToStatus: Record<string, InterviewStatus> = {
    first: 'first_interview',
    second: 'second_interview',
    third: 'third_interview',
    fourth: 'fourth_interview',
    fifth: 'fifth_interview',
    hr: 'hr_interview'
  }

  return roundToStatus[latestRound.round] || 'resume_sent'
}
