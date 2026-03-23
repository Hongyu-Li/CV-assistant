import { describe, it, expect } from 'vitest'
import {
  INTERVIEW_STATUSES,
  REJECTED_STATUSES,
  AUTO_SAVE_DEBOUNCE_MS,
  COPY_FEEDBACK_DURATION_MS,
  AI_CHAT_TIMEOUT_MS,
  AI_PDF_EXTRACT_TIMEOUT_MS,
  MAX_VISIBLE_KEYWORDS
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
