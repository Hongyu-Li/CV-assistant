/**
 * Mac App Store Screenshot Suite (v3)
 *
 * Captures professional screenshots of the CV Assistant Electron app for both
 * English and Chinese locales, suitable for Mac App Store submission.
 *
 * All demo data is seeded via IPC before capture and cleaned up afterwards.
 * No real AI API calls are made.
 *
 * Target viewport: 1440×900 (standard MacBook resolution).
 * Device scale factor: 2 → 2880×1800 physical pixels (Apple Retina).
 *
 * Output structure:
 *   screenshots/raw/en-US/
 *     01_hero_cv_dialog.png
 *     02_resumes_list.png
 *     03_interview_timeline.png
 *     04_profile.png
 *     05_export.png
 *     06_settings.png
 *   screenshots/raw/zh-CN/
 *     (same 6 frames)
 */

import { test, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RAW_DIR = path.join('tests', 'screenshots', 'raw')
const VIEWPORT = { width: 1440, height: 900 }
const DEVICE_SCALE_FACTOR = 2

type ElectronWindow = Window & {
  electron: { ipcRenderer: { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> } }
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_PROFILE = {
  personalInfo: {
    name: 'Alex Chen',
    email: 'alex.chen@example.com',
    phone: '+1 (415) 555-0123',
    location: 'San Francisco, CA'
  },
  workExperience: [
    {
      company: 'TechCorp',
      title: 'Senior Software Engineer',
      date: 'Jan 2022 - Present',
      description:
        'Led development of core platform features serving 2M+ users.\n- Architected microservices migration reducing latency by 40%\n- Mentored team of 5 junior engineers'
    },
    {
      company: 'StartupXYZ',
      title: 'Full Stack Developer',
      date: 'Mar 2019 - Dec 2021',
      description:
        'Built real-time collaboration features from scratch.\n- Implemented WebSocket-based messaging system\n- Designed RESTful APIs handling 10K+ requests/min'
    }
  ],
  education: [
    {
      school: 'Stanford University',
      degree: 'M.S. Computer Science',
      date: 'Sep 2017 - Jun 2019',
      description: 'Focus: Distributed Systems and Machine Learning'
    },
    {
      school: 'UC Berkeley',
      degree: 'B.S. Computer Science',
      date: 'Sep 2013 - Jun 2017',
      description: "GPA: 3.85/4.0, Dean's List"
    }
  ],
  projects: [
    {
      name: 'Open Source CLI Tool',
      tech: 'TypeScript, Node.js, Commander',
      description: 'Built a developer productivity CLI with 2K+ GitHub stars'
    }
  ]
}

const DEMO_CVS = [
  {
    id: 'screenshot-demo-1',
    filename: 'screenshot-demo-1.json',
    jobTitle: 'Senior Frontend Engineer',
    companyName: 'Google',
    targetSalary: '$240,000',
    experienceLevel: 'Senior',
    notes: 'Dream role in Chrome team',
    jobDescription: 'We are looking for a Senior Frontend Engineer to join the Chrome team...',
    generatedCV:
      '# Alex Chen\n\n## Senior Frontend Engineer\n\n### Summary\nSenior software engineer with 5+ years of experience building high-performance web applications...\n\n### Experience\n**Senior Software Engineer** — TechCorp (2022–Present)\n- Led frontend architecture redesign, improving performance by 35%\n- Built component library used across 12 product teams\n\n**Full Stack Developer** — StartupXYZ (2019–2021)\n- Developed real-time collaboration features with WebSocket\n- Designed RESTful APIs handling 10K+ requests/min\n\n### Education\n**M.S. Computer Science** — Stanford University (2017–2019)\n**B.S. Computer Science** — UC Berkeley (2013–2017)',
    status: 'generated',
    interviewStatus: 'offer_accepted',
    interviewRounds: [
      {
        id: 'r1',
        round: 'first',
        date: '2025-06-15',
        notes: 'Technical phone screen — system design questions',
        result: 'passed'
      },
      {
        id: 'r2',
        round: 'second',
        date: '2025-06-22',
        notes: 'On-site coding: React performance optimization',
        result: 'passed'
      },
      {
        id: 'r3',
        round: 'hr',
        date: '2025-06-28',
        notes: 'HR final round — salary negotiation',
        result: 'passed'
      }
    ],
    cvLanguage: 'en',
    keywords: ['React', 'TypeScript', 'Performance', 'Architecture'],
    createdAt: '2025-06-10T08:00:00Z',
    lastModified: '2025-06-28T16:00:00Z'
  },
  {
    id: 'screenshot-demo-2',
    filename: 'screenshot-demo-2.json',
    jobTitle: 'Staff Engineer',
    companyName: 'Stripe',
    targetSalary: '$280,000',
    experienceLevel: 'Staff',
    status: 'generated',
    interviewStatus: 'first_interview',
    interviewRounds: [
      {
        id: 'r1',
        round: 'first',
        date: '2025-07-01',
        notes: 'System design interview scheduled',
        result: 'pending'
      }
    ],
    createdAt: '2025-06-20T10:00:00Z',
    lastModified: '2025-07-01T09:00:00Z'
  },
  {
    id: 'screenshot-demo-3',
    filename: 'screenshot-demo-3.json',
    jobTitle: 'Engineering Manager',
    companyName: 'Meta',
    targetSalary: '$300,000',
    experienceLevel: 'Manager',
    status: 'generated',
    interviewStatus: 'resume_sent',
    createdAt: '2025-07-05T14:00:00Z',
    lastModified: '2025-07-05T14:00:00Z'
  },
  {
    id: 'screenshot-demo-4',
    filename: 'screenshot-demo-4.json',
    jobTitle: 'Principal Engineer',
    companyName: 'Apple',
    experienceLevel: 'Principal',
    status: 'draft',
    interviewStatus: 'draft',
    createdAt: '2025-07-08T09:00:00Z',
    lastModified: '2025-07-08T09:00:00Z'
  },
  {
    id: 'screenshot-demo-5',
    filename: 'screenshot-demo-5.json',
    jobTitle: 'Tech Lead',
    companyName: 'Netflix',
    targetSalary: '$260,000',
    experienceLevel: 'Lead',
    status: 'generated',
    interviewStatus: 'hr_interview',
    interviewRounds: [
      {
        id: 'r1',
        round: 'first',
        date: '2025-06-20',
        notes: 'Algorithm round — passed',
        result: 'passed'
      },
      {
        id: 'r2',
        round: 'second',
        date: '2025-06-25',
        notes: 'System design — passed',
        result: 'passed'
      }
    ],
    createdAt: '2025-06-15T11:00:00Z',
    lastModified: '2025-06-30T10:00:00Z'
  }
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForAppReady(window: Page): Promise<void> {
  await window.waitForLoadState('domcontentloaded')
  await window.waitForSelector('nav button', { state: 'visible', timeout: 15000 })
  await window.waitForTimeout(600)
}

/**
 * Sidebar order (matches App.tsx):
 *   0 – Profile
 *   1 – CVs
 *   2 – Settings
 */
async function navigateTo(window: Page, buttonIndex: number): Promise<void> {
  const navButtons = window.locator('nav button')
  await navButtons.nth(buttonIndex).click()
  await window.waitForTimeout(500)
}

async function capture(window: Page, locale: string, filename: string): Promise<void> {
  const dir = path.join(RAW_DIR, locale)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  await window.screenshot({
    path: path.join(dir, filename),
    fullPage: false
  })
}

/**
 * Switch app language via the Settings page language Select.
 *
 * The select always shows two options: "English" and "中文".
 * We click the trigger, then click the desired option.
 */
async function switchLanguage(window: Page, targetLang: 'en' | 'zh'): Promise<void> {
  // Navigate to Settings
  await navigateTo(window, 2)
  await window.waitForSelector('main h2', { state: 'visible', timeout: 8000 })

  // Scroll to top to ensure General Settings card is visible
  await window.evaluate((): void => {
    const mainEl = document.querySelector('main')
    if (mainEl) mainEl.scrollTop = 0
  })
  await window.waitForTimeout(300)

  // The language select is the last combobox in the General Settings card.
  // There are multiple comboboxes: workspace, theme, language.
  // Language is typically the last one in the General card.
  const comboboxes = window.locator('button[role="combobox"]')
  const count = await comboboxes.count()

  // Find the combobox that currently shows either "English" or "中文"
  let langCombobox: ReturnType<typeof comboboxes.nth> | null = null
  for (let i = 0; i < count; i++) {
    const text = await comboboxes.nth(i).textContent()
    if (text && (/English/i.test(text) || /中文/.test(text))) {
      langCombobox = comboboxes.nth(i)
      break
    }
  }

  if (!langCombobox) {
    throw new Error('Could not find language combobox')
  }

  await langCombobox.click()
  await window.waitForTimeout(300)

  // Click the target option
  const targetText = targetLang === 'zh' ? '中文' : 'English'
  const option = window.locator('[role="option"]').filter({ hasText: targetText }).first()
  await option.click()
  await window.waitForTimeout(1000) // Wait for i18n to fully re-render
}

/**
 * Seed all demo data via IPC: profile + 5 CVs.
 */
async function seedDemoData(page: Page): Promise<void> {
  await page.evaluate(
    (profileData) =>
      (window as unknown as ElectronWindow).electron.ipcRenderer.invoke(
        'profile:save',
        profileData
      ),
    DEMO_PROFILE
  )

  for (const cv of DEMO_CVS) {
    await page.evaluate(
      (payload) =>
        (window as unknown as ElectronWindow).electron.ipcRenderer.invoke('cv:save', {
          filename: payload.filename,
          data: payload
        }),
      cv
    )
  }

  await page.waitForTimeout(500)
}

async function cleanupDemoData(page: Page): Promise<void> {
  for (const cv of DEMO_CVS) {
    try {
      await page.evaluate(
        (filename) =>
          (window as unknown as ElectronWindow).electron.ipcRenderer.invoke('cv:delete', {
            filename
          }),
        cv.filename
      )
    } catch (_) {
      void _
    }
  }
}

// ---------------------------------------------------------------------------
// Capture all 6 frames for a given locale
// ---------------------------------------------------------------------------

async function captureAllFrames(window: Page, locale: string): Promise<void> {
  // 06 – Settings (captured first since we're already on Settings after switchLanguage)
  await navigateTo(window, 2)
  await window.waitForSelector('main h2', { state: 'visible', timeout: 8000 })
  await window.evaluate((): void => {
    const mainEl = document.querySelector('main')
    if (mainEl) mainEl.scrollTop = 0
  })
  await window.waitForTimeout(300)
  await capture(window, locale, '06_settings.png')

  // 04 – Profile page with seeded education + work experience
  await navigateTo(window, 0)
  await window.waitForSelector('main', { state: 'visible', timeout: 8000 })
  await window.waitForTimeout(600)
  await capture(window, locale, '04_profile.png')

  // 02 – CVs list with demo cards
  await navigateTo(window, 1)
  await window.waitForSelector('[class*="grid"] [class*="card"], [class*="border-dashed"]', {
    timeout: 8000
  })
  await window.waitForTimeout(500)
  await capture(window, locale, '02_resumes_list.png')

  // 01 – Create CV dialog filled with demo data
  const newCvButton = window
    .locator('button')
    .filter({ hasText: /new cv|新建简历/i })
    .first()
  await newCvButton.waitFor({ state: 'visible', timeout: 8000 })
  await newCvButton.click()
  await window.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 6000 })
  await window.waitForTimeout(400)

  // Fill in the form fields for a realistic screenshot
  const dialogLocator = window.locator('[role="dialog"]')

  // Job title input (use id selector)
  const jobTitleInput = dialogLocator.locator('#resume-job-title')
  await jobTitleInput.waitFor({ state: 'visible', timeout: 5000 })
  await jobTitleInput.fill('Senior Software Engineer')

  // Company name input (use id selector)
  const companyInput = dialogLocator.locator('#resume-company-name')
  await companyInput.fill('Anthropic')

  await window.waitForTimeout(300)
  await capture(window, locale, '01_hero_cv_dialog.png')

  // Close the "New CV" dialog
  const cancelButton = dialogLocator
    .locator('button')
    .filter({ hasText: /cancel|取消/i })
    .first()
  await cancelButton.click()
  await window.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 })
  await window.waitForTimeout(300)

  // 03 – Interview timeline: open demo CV 1 (Google, offer_accepted) which has 3 rounds
  // Find the card for "Google" and click it
  const googleCard = window
    .locator('[class*="card"]')
    .filter({ hasText: /Google/i })
    .first()
  await googleCard.waitFor({ state: 'visible', timeout: 8000 })
  await googleCard.click()
  await window.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 6000 })
  await window.waitForTimeout(500)

  // Scroll dialog to bottom to reach the Interview Rounds section
  await window.evaluate((): void => {
    const dialog = document.querySelector('[role="dialog"]')
    if (dialog) {
      const scrollable = dialog.querySelector('[class*="overflow"]') ?? dialog
      scrollable.scrollTop = scrollable.scrollHeight
    }
  })
  await window.waitForTimeout(400)

  // Expand "Interview Rounds" collapsible if present
  const interviewRoundsToggle = window
    .locator('[role="dialog"] button')
    .filter({ hasText: /interview rounds|面试轮次/i })
    .first()
  const toggleVisible = await interviewRoundsToggle.isVisible().catch((): boolean => false)
  if (toggleVisible) {
    await interviewRoundsToggle.click()
    await window.waitForTimeout(400)
  }

  await capture(window, locale, '03_interview_timeline.png')

  // 05 – Export: scroll to Generated CV section and open download dropdown
  // Scroll back up to find the Generated CV section
  await window.evaluate((): void => {
    const dialog = document.querySelector('[role="dialog"]')
    if (dialog) {
      const scrollable = dialog.querySelector('[class*="overflow"]') ?? dialog
      scrollable.scrollTop = 0
    }
  })
  await window.waitForTimeout(300)

  // Scroll dialog content to find the generated CV / download button area
  await window.evaluate((): void => {
    const dialog = document.querySelector('[role="dialog"]')
    if (dialog) {
      const scrollable = dialog.querySelector('[class*="overflow"]') ?? dialog
      // Scroll to roughly the middle where generated CV section lives
      scrollable.scrollTop = scrollable.scrollHeight * 0.4
    }
  })
  await window.waitForTimeout(400)

  // Click the Download button (aria-label="Download") to open dropdown
  const downloadButton = window.locator('[role="dialog"] button[aria-label="Download"]').first()
  const downloadVisible = await downloadButton.isVisible().catch((): boolean => false)
  if (downloadVisible) {
    await downloadButton.click()
    await window.waitForTimeout(300)
  }

  await capture(window, locale, '05_export.png')

  // Close dialog
  const closeCvButton = window
    .locator('[role="dialog"] button')
    .filter({ hasText: /cancel|取消/i })
    .first()
  const closeVisible = await closeCvButton.isVisible().catch((): boolean => false)
  if (closeVisible) {
    await closeCvButton.click()
    await window.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 })
  } else {
    // Try pressing Escape as fallback
    await window.keyboard.press('Escape')
    await window.waitForTimeout(500)
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('App Store Screenshots (Bilingual)', () => {
  let electronApp: ElectronApplication
  let window: Page

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.', `--force-device-scale-factor=${DEVICE_SCALE_FACTOR}`]
    })
    window = await electronApp.firstWindow()
    await window.setViewportSize({
      width: VIEWPORT.width,
      height: VIEWPORT.height
    })
    await waitForAppReady(window)

    // Seed all demo data once before any capture
    await seedDemoData(window)
  })

  test.afterAll(async () => {
    // Clean up demo data
    if (window) {
      try {
        await cleanupDemoData(window)
      } catch (_ignored) {
        void _ignored
      }
    }
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('Capture English screenshots', async () => {
    await switchLanguage(window, 'en')
    await captureAllFrames(window, 'en-US')
  })

  test('Capture Chinese screenshots', async () => {
    await switchLanguage(window, 'zh')
    await captureAllFrames(window, 'zh-CN')
  })
})
