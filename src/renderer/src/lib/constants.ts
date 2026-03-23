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

export const AUTO_SAVE_DEBOUNCE_MS = 500
export const COPY_FEEDBACK_DURATION_MS = 2000
export const AI_CHAT_TIMEOUT_MS = 60_000
export const AI_PDF_EXTRACT_TIMEOUT_MS = 180_000
export const MAX_VISIBLE_KEYWORDS = 4
