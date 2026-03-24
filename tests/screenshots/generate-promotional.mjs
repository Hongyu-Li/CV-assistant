import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const RAW_DIR = path.join(__dirname, 'raw')
const DRAFT_DIR = path.join(__dirname, 'drafts')
const FINAL_DIR = path.join(__dirname, 'final')

// ---------------------------------------------------------------------------
// Configuration: all 6 frames × 2 locales = 12 composites
// ---------------------------------------------------------------------------

const CONFIGS = [
  // ---- English ----
  {
    locale: 'en-US',
    name: '01_hero_cv_dialog',
    source: 'en-US/01_hero_cv_dialog.png',
    headline: 'AI Crafts Your Perfect CV',
    subline: 'Fill in job details and let AI generate a tailored, professional resume',
    badge: 'Smart Generation'
  },
  {
    locale: 'en-US',
    name: '02_resumes_list',
    source: 'en-US/02_resumes_list.png',
    headline: 'Track Every Application',
    subline: 'Manage all your job applications with status tracking and interview stages',
    badge: 'Job Tracker'
  },
  {
    locale: 'en-US',
    name: '03_interview_timeline',
    source: 'en-US/03_interview_timeline.png',
    headline: 'Interview Timeline',
    subline: 'Log each interview round with dates, notes, and results — all in one place',
    badge: 'Round by Round'
  },
  {
    locale: 'en-US',
    name: '04_profile',
    source: 'en-US/04_profile.png',
    headline: 'Smart Profile Management',
    subline: 'Import from PDF or build your profile with education, experience, and projects',
    badge: 'PDF Import'
  },
  {
    locale: 'en-US',
    name: '05_export',
    source: 'en-US/05_export.png',
    headline: 'Export Anywhere',
    subline: 'Download your generated CV as a styled PDF or clean Markdown file',
    badge: 'PDF & Markdown'
  },
  {
    locale: 'en-US',
    name: '06_settings',
    source: 'en-US/06_settings.png',
    headline: '12 AI Providers Built In',
    subline: 'Use OpenAI, Anthropic, Gemini, DeepSeek, Ollama, and more',
    badge: 'Your Choice'
  },
  // ---- Chinese ----
  {
    locale: 'zh-CN',
    name: '01_hero_cv_dialog',
    source: 'zh-CN/01_hero_cv_dialog.png',
    headline: 'AI 为你量身定制简历',
    subline: '填写职位信息，AI 生成量身定制的专业简历',
    badge: '智能生成'
  },
  {
    locale: 'zh-CN',
    name: '02_resumes_list',
    source: 'zh-CN/02_resumes_list.png',
    headline: '追踪每一次求职',
    subline: '管理所有求职申请，追踪面试状态与进度',
    badge: '求职管理'
  },
  {
    locale: 'zh-CN',
    name: '03_interview_timeline',
    source: 'zh-CN/03_interview_timeline.png',
    headline: '面试进度追踪',
    subline: '记录每轮面试的日期、笔记和结果，一目了然',
    badge: '逐轮记录'
  },
  {
    locale: 'zh-CN',
    name: '04_profile',
    source: 'zh-CN/04_profile.png',
    headline: '智能档案管理',
    subline: '从 PDF 导入或手动填写教育背景、工作经历和项目',
    badge: 'PDF 导入'
  },
  {
    locale: 'zh-CN',
    name: '05_export',
    source: 'zh-CN/05_export.png',
    headline: '随处导出',
    subline: '将生成的简历导出为精美的 PDF 或 Markdown 文件',
    badge: 'PDF 和 Markdown'
  },
  {
    locale: 'zh-CN',
    name: '06_settings',
    source: 'zh-CN/06_settings.png',
    headline: '内置 12 家 AI 服务商',
    subline: '支持 OpenAI、Anthropic、Gemini、DeepSeek、Ollama 等',
    badge: '灵活选择'
  }
]

// ---------------------------------------------------------------------------
// Theme Definitions
// ---------------------------------------------------------------------------

function getTheme(name) {
  // 01 – Hero CV Dialog: Teal glow
  if (name.includes('01_hero')) {
    return {
      id: 'theme-01',
      base: '#070B14',
      glow: 'rgba(20, 184, 166, 0.4)',
      orbs: `
        <div class="orb" style="width: 1200px; height: 1200px; top: -300px; left: -200px; background: radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, transparent 70%);"></div>
        <div class="orb" style="width: 900px; height: 900px; bottom: -100px; right: -100px; background: radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%);"></div>
        <div class="orb" style="width: 600px; height: 600px; top: 40%; left: 30%; background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);"></div>
      `,
      bgStyle: `
        background-color: #070B14;
        background-image: 
          radial-gradient(1200px 900px at 15% 20%, rgba(20, 184, 166, 0.18), transparent 55%),
          radial-gradient(900px 700px at 85% 30%, rgba(6, 182, 212, 0.14), transparent 60%),
          radial-gradient(1000px 900px at 60% 90%, rgba(13, 148, 136, 0.10), transparent 60%);
      `
    }
  }
  // 02 – Resumes List: Purple glow
  if (name.includes('02_resumes')) {
    return {
      id: 'theme-02',
      base: '#0D0915',
      glow: 'rgba(139, 92, 246, 0.4)',
      orbs: `
        <div class="orb" style="width: 1300px; height: 1300px; top: -400px; left: 10%; background: radial-gradient(circle, rgba(139, 92, 246, 0.22) 0%, transparent 70%);"></div>
        <div class="orb" style="width: 800px; height: 800px; bottom: 10%; right: 0; background: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%);"></div>
        <div class="orb" style="width: 500px; height: 500px; top: 40%; right: 30%; background: radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 70%);"></div>
      `,
      bgStyle: `
        background-color: #0D0915;
        background-image: 
          radial-gradient(1300px 1000px at 30% 20%, rgba(139, 92, 246, 0.16), transparent 55%),
          radial-gradient(900px 800px at 90% 60%, rgba(168, 85, 247, 0.12), transparent 60%),
          radial-gradient(800px 800px at 10% 90%, rgba(124, 58, 237, 0.10), transparent 60%);
      `
    }
  }
  // 03 – Interview Timeline: Rose/Pink glow
  if (name.includes('03_interview')) {
    return {
      id: 'theme-03',
      base: '#120A10',
      glow: 'rgba(244, 63, 94, 0.4)',
      orbs: `
        <div class="orb" style="width: 1100px; height: 1100px; top: -200px; right: -50px; background: radial-gradient(circle, rgba(244, 63, 94, 0.22) 0%, transparent 70%);"></div>
        <div class="orb" style="width: 900px; height: 900px; bottom: -100px; left: 5%; background: radial-gradient(circle, rgba(251, 113, 133, 0.18) 0%, transparent 70%);"></div>
        <div class="orb" style="width: 600px; height: 600px; top: 35%; left: 25%; background: radial-gradient(circle, rgba(236, 72, 153, 0.14) 0%, transparent 70%);"></div>
      `,
      bgStyle: `
        background-color: #120A10;
        background-image: 
          radial-gradient(1200px 900px at 75% 25%, rgba(244, 63, 94, 0.16), transparent 55%),
          radial-gradient(900px 700px at 15% 75%, rgba(251, 113, 133, 0.12), transparent 60%),
          radial-gradient(1000px 800px at 50% 50%, rgba(190, 18, 60, 0.10), transparent 60%);
      `
    }
  }
  // 04 – Profile: Blue glow
  if (name.includes('04_profile')) {
    return {
      id: 'theme-04',
      base: '#0A0B1A',
      glow: 'rgba(59, 130, 246, 0.4)',
      orbs: `
        <div class="orb" style="width: 1100px; height: 1100px; top: -200px; right: -100px; background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%);"></div>
        <div class="orb" style="width: 800px; height: 800px; bottom: 0; left: -100px; background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%);"></div>
        <div class="orb" style="width: 700px; height: 700px; top: 20%; left: 20%; background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);"></div>
      `,
      bgStyle: `
        background-color: #0A0B1A;
        background-image: 
          radial-gradient(1200px 900px at 80% 20%, rgba(59, 130, 246, 0.18), transparent 55%),
          radial-gradient(900px 700px at 20% 80%, rgba(99, 102, 241, 0.14), transparent 60%),
          radial-gradient(1000px 900px at 50% 50%, rgba(37, 99, 235, 0.10), transparent 60%);
      `
    }
  }
  // 05 – Export: Amber/Orange glow
  if (name.includes('05_export')) {
    return {
      id: 'theme-05',
      base: '#0F0A05',
      glow: 'rgba(245, 158, 11, 0.4)',
      orbs: `
        <div class="orb" style="width: 1200px; height: 1200px; top: -300px; left: -100px; background: radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%);"></div>
        <div class="orb" style="width: 1000px; height: 1000px; bottom: -200px; right: -100px; background: radial-gradient(circle, rgba(249, 115, 22, 0.18) 0%, transparent 70%);"></div>
        <div class="orb" style="width: 700px; height: 700px; top: 40%; right: 40%; background: radial-gradient(circle, rgba(251, 113, 133, 0.12) 0%, transparent 70%);"></div>
      `,
      bgStyle: `
        background-color: #0F0A05;
        background-image: 
          radial-gradient(1300px 1000px at 20% 30%, rgba(245, 158, 11, 0.15), transparent 55%),
          radial-gradient(900px 800px at 80% 80%, rgba(249, 115, 22, 0.12), transparent 60%),
          radial-gradient(800px 800px at 50% 0%, rgba(217, 119, 6, 0.10), transparent 60%);
      `
    }
  }
  // 06 – Settings and fallback: Emerald glow
  return {
    id: 'theme-06',
    base: '#050E0A',
    glow: 'rgba(16, 185, 129, 0.4)',
    orbs: `
      <div class="orb" style="width: 1000px; height: 1000px; top: -100px; right: 10%; background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%);"></div>
      <div class="orb" style="width: 900px; height: 900px; bottom: -200px; left: 0; background: radial-gradient(circle, rgba(20, 184, 166, 0.2) 0%, transparent 70%);"></div>
      <div class="orb" style="width: 600px; height: 600px; top: 30%; left: 40%; background: radial-gradient(circle, rgba(132, 204, 22, 0.12) 0%, transparent 70%);"></div>
    `,
    bgStyle: `
      background-color: #050E0A;
      background-image: 
        radial-gradient(1100px 900px at 70% 30%, rgba(16, 185, 129, 0.18), transparent 55%),
        radial-gradient(1000px 800px at 20% 80%, rgba(20, 184, 166, 0.14), transparent 60%),
        radial-gradient(800px 600px at 50% 10%, rgba(5, 150, 105, 0.10), transparent 60%);
    `
  }
}

// ---------------------------------------------------------------------------
// HTML Template
// ---------------------------------------------------------------------------

function generateHTML(config, base64Image) {
  const theme = getTheme(config.name)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;600;700;800&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      width: 2880px;
      height: 1800px;
      font-family: 'Inter', 'Noto Sans SC', sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      ${theme.bgStyle}
    }

    /* Noise Texture Overlay */
    body::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0.04;
      pointer-events: none;
      z-index: 1;
      mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    /* Subtle Grid Overlay */
    body::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0.03;
      pointer-events: none;
      z-index: 0;
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.3) 1px, transparent 1px);
      background-size: 80px 80px;
    }

    /* Decorative Orbs */
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      z-index: 0;
    }

    /* Content Area */
    .content {
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      height: 100%;
    }

    .text-area {
      padding-top: 100px;
      height: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 24px;
    }

    .badge {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 100px;
      padding: 10px 28px;
      font-size: 26px;
      font-weight: 600;
      color: white;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      letter-spacing: 0.5px;
    }

    .headline {
      font-size: 72px;
      font-weight: 800;
      color: white;
      text-shadow: 0 4px 30px rgba(0,0,0,0.3);
      letter-spacing: -1.5px;
      margin: 0;
      line-height: 1.1;
    }

    .subline {
      font-size: 30px;
      font-weight: 400;
      color: rgba(255,255,255,0.85);
      max-width: 1600px;
      line-height: 1.5;
      margin: 0;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }

    /* Screenshot Area */
    .screenshot-container {
      flex: 1;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding-bottom: 0;
      perspective: 2000px;
    }

    .screenshot {
      width: 2400px;
      border-radius: 16px 16px 0 0;
      /* Enhanced shadow/glow matching the theme */
      box-shadow: 
        0 -20px 80px rgba(0,0,0,0.4), 
        0 -5px 20px rgba(0,0,0,0.2),
        0 0 100px ${theme.glow};
      object-fit: cover;
      object-position: top center;
      display: block;
      transform: translateY(0);
      /* Subtle border to pop against dark bg */
      border: 1px solid rgba(255,255,255,0.08);
      border-bottom: none;
      background: #1e1e1e; /* Fallback for transparency */
    }
  </style>
</head>
<body>
  ${theme.orbs}
  
  <div class="content">
    <div class="text-area">
      <div class="badge">${config.badge}</div>
      <h1 class="headline">${config.headline}</h1>
      <p class="subline">${config.subline}</p>
    </div>
    
    <div class="screenshot-container">
      <img src="${base64Image}" class="screenshot" alt="App Screenshot" />
    </div>
  </div>
</body>
</html>
  `
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Determine output mode from CLI args
  const isDraft = process.argv.includes('--draft')
  const outDir = isDraft ? DRAFT_DIR : FINAL_DIR

  console.log(`Mode: ${isDraft ? 'DRAFT' : 'FINAL'}`)
  console.log(`Output: ${outDir}`)
  console.log('Launching browser...')

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 2880, height: 1800 },
    deviceScaleFactor: 1
  })
  const page = await context.newPage()

  let processed = 0
  let skipped = 0

  for (const config of CONFIGS) {
    console.log(`Processing ${config.locale}/${config.name}...`)

    // Read source image from raw/
    const sourcePath = path.join(RAW_DIR, config.source)
    if (!fs.existsSync(sourcePath)) {
      console.error(`  ⚠ Source image not found: ${sourcePath} — skipping`)
      skipped++
      continue
    }

    const imageBuffer = fs.readFileSync(sourcePath)
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`

    // Generate HTML
    const html = generateHTML(config, base64Image)

    // Render
    await page.setContent(html)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Wait for fonts

    // Ensure output directory exists
    const localeDir = path.join(outDir, config.locale)
    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true })
    }

    // Take screenshot
    const outputPath = path.join(localeDir, `${config.name}.png`)
    await page.screenshot({ path: outputPath, type: 'png' })

    console.log(`  ✓ Saved to ${outputPath}`)
    processed++
  }

  await browser.close()
  console.log(`\nDone. ${processed} generated, ${skipped} skipped.`)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
