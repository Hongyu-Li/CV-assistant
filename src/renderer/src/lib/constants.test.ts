import { describe, it, expect } from 'vitest'
import {
  INTERVIEW_STATUSES,
  REJECTED_STATUSES,
  AUTO_SAVE_DEBOUNCE_MS,
  COPY_FEEDBACK_DURATION_MS,
  AI_CHAT_TIMEOUT_MS,
  AI_PDF_EXTRACT_TIMEOUT_MS,
  MAX_VISIBLE_KEYWORDS,
  getInterviewStatusColor
} from './constants'

describe('INTERVIEW_STATUSES', () => {
  it('is a non-empty array', () => {
    expect(INTERVIEW_STATUSES.length).toBeGreaterThan(0)
  })

  it('contains all 5 interview rounds', () => {
    expect(INTERVIEW_STATUSES).toContain('first_interview')
    expect(INTERVIEW_STATUSES).toContain('fifth_interview')
    expect(INTERVIEW_STATUSES).toHaveLength(5)
  })

  it('does not contain non-interview statuses', () => {
    expect(INTERVIEW_STATUSES).not.toContain('resume_sent')
    expect(INTERVIEW_STATUSES).not.toContain('offer_accepted')
    expect(INTERVIEW_STATUSES).not.toContain('hr_interview')
  })
})

describe('REJECTED_STATUSES', () => {
  it('is a non-empty array', () => {
    expect(REJECTED_STATUSES.length).toBeGreaterThan(0)
  })

  it('contains rejection statuses', () => {
    expect(REJECTED_STATUSES).toContain('offer_rejected')
    expect(REJECTED_STATUSES).toContain('interview_failed')
    expect(REJECTED_STATUSES).toHaveLength(2)
  })
})

describe('magic number constants', () => {
  it('AUTO_SAVE_DEBOUNCE_MS is 500', () => {
    expect(AUTO_SAVE_DEBOUNCE_MS).toBe(500)
  })

  it('COPY_FEEDBACK_DURATION_MS is 2000', () => {
    expect(COPY_FEEDBACK_DURATION_MS).toBe(2000)
  })

  it('AI_CHAT_TIMEOUT_MS is 60000', () => {
    expect(AI_CHAT_TIMEOUT_MS).toBe(60_000)
  })

  it('AI_PDF_EXTRACT_TIMEOUT_MS is 180000', () => {
    expect(AI_PDF_EXTRACT_TIMEOUT_MS).toBe(180_000)
  })

  it('MAX_VISIBLE_KEYWORDS is 4', () => {
    expect(MAX_VISIBLE_KEYWORDS).toBe(4)
  })
})

describe('getInterviewStatusColor', () => {
  it('returns muted for draft', () => {
    expect(getInterviewStatusColor('draft')).toContain('bg-muted')
  })

  it('returns muted for resume_sent', () => {
    expect(getInterviewStatusColor('resume_sent')).toContain('bg-muted')
  })

  it('returns info for interview rounds', () => {
    const rounds = [
      'first_interview',
      'second_interview',
      'third_interview',
      'fourth_interview',
      'fifth_interview'
    ] as const
    for (const status of rounds) {
      expect(getInterviewStatusColor(status)).toContain('bg-info/10')
    }
  })

  it('returns interview for hr_interview', () => {
    expect(getInterviewStatusColor('hr_interview')).toContain('bg-interview/10')
  })

  it('returns success for offer_accepted', () => {
    expect(getInterviewStatusColor('offer_accepted')).toContain('bg-success/10')
  })

  it('returns destructive for rejection statuses', () => {
    expect(getInterviewStatusColor('offer_rejected')).toContain('bg-destructive/10')
    expect(getInterviewStatusColor('interview_failed')).toContain('bg-destructive/10')
  })

  it('returns muted for unknown status', () => {
    expect(getInterviewStatusColor('unknown' as never)).toContain('bg-muted')
  })
})
