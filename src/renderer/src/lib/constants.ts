import type { InterviewStatus } from '../components/resume-dialog'

export const INTERVIEW_STATUSES: readonly InterviewStatus[] = [
  'first_interview',
  'second_interview',
  'third_interview',
  'fourth_interview',
  'fifth_interview'
] as const

export const REJECTED_STATUSES: readonly InterviewStatus[] = [
  'offer_rejected',
  'interview_failed'
] as const

export type FilterTab = 'all' | 'draft' | 'interview' | 'hr' | 'offer' | 'rejected'

export function getInterviewStatusColor(status: InterviewStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-muted text-muted-foreground border-border'
    case 'resume_sent':
      return 'bg-muted text-muted-foreground border-border'
    case 'first_interview':
    case 'second_interview':
    case 'third_interview':
    case 'fourth_interview':
    case 'fifth_interview':
      return 'bg-info/10 text-info-foreground border-info/20'
    case 'hr_interview':
      return 'bg-interview/10 text-interview-foreground border-interview/20'
    case 'offer_accepted':
      return 'bg-success/10 text-success-foreground border-success/20'
    case 'offer_rejected':
    case 'interview_failed':
      return 'bg-destructive/10 text-destructive border-destructive/20'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export const AUTO_SAVE_DEBOUNCE_MS = 500
export const COPY_FEEDBACK_DURATION_MS = 2000
export const AI_CHAT_TIMEOUT_MS = 60_000
export const AI_PDF_EXTRACT_TIMEOUT_MS = 180_000
export const AI_LOCAL_TIMEOUT_MS = 120_000
export const MAX_VISIBLE_KEYWORDS = 4
