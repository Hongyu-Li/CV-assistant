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
      return 'bg-slate-100 text-slate-600 border-slate-200'
    case 'resume_sent':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    case 'first_interview':
    case 'second_interview':
    case 'third_interview':
    case 'fourth_interview':
    case 'fifth_interview':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'hr_interview':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'offer_accepted':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'offer_rejected':
    case 'interview_failed':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export const AUTO_SAVE_DEBOUNCE_MS = 500
export const COPY_FEEDBACK_DURATION_MS = 2000
export const AI_CHAT_TIMEOUT_MS = 60_000
export const AI_PDF_EXTRACT_TIMEOUT_MS = 180_000
export const MAX_VISIBLE_KEYWORDS = 4
