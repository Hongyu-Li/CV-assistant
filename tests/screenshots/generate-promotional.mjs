import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_DIR = path.join(__dirname, 'app-store', 'base')
const OUT_DIR = path.join(__dirname, 'app-store')

// Configuration for all screenshots
const CONFIGS = [
  // Chinese
  {
    locale: 'zh',
    name: '01-profile',
    source: 'zh-profile-raw.png',
    headline: '智能个人档案管理',
    subline: '完善个人资料，为 AI 简历生成提供基础',
    badge: '支持 Markdown 编辑'
  },
  {
    locale: 'zh',
    name: '02-resumes',
    source: 'zh-resumes-raw.png',
    headline: 'AI 赋能简历生成',
    subline: '基于个人档案 + 职位描述，一键生成定制简历',
    badge: '支持 12 家 AI 服务商'
  },
  // English
  {
    locale: 'en',
    name: '01-profile',
    source: 'en-profile-raw.png',
    headline: 'Smart Profile Management',
    subline: 'Build your professional profile as the foundation for AI-generated resumes',
    badge: 'Markdown Editor'
  },
  {
    locale: 'en',
    name: '02-resumes',
    source: 'en-resumes-raw.png',
    headline: 'AI-Powered Resume Generation',
    subline: 'Generate tailored CVs from your profile + job descriptions in one click',
    badge: '12 AI Providers'
  }
]

// HTML Template Generator
function generateHTML(config, base64Image) {
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
      background: #1a3a4a; /* Fallback */
      background: linear-gradient(145deg, #1a3a4a 0%, #1e4d5c 20%, #1a6b6a 50%, #2d8a7e 75%, #3aaa96 100%);
      font-family: 'Inter', 'Noto Sans SC', sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    /* Decorative Orbs */
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
      z-index: 0;
    }
    .orb-1 {
      width: 1200px;
      height: 1200px;
      top: -400px;
      left: -200px;
      background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
    }
    .orb-2 {
      width: 1000px;
      height: 1000px;
      bottom: -200px;
      right: -200px;
      background: radial-gradient(circle, rgba(64,224,208,0.8) 0%, rgba(64,224,208,0) 70%);
    }

    /* Content Area */
    .content {
      z-index: 1;
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
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 100px;
      padding: 10px 28px;
      font-size: 26px;
      font-weight: 600;
      color: white;
      backdrop-filter: blur(10px);
    }

    .headline {
      font-size: 72px;
      font-weight: 800;
      color: white;
      text-shadow: 0 2px 20px rgba(0,0,0,0.15);
      letter-spacing: -1px;
      margin: 0;
      line-height: 1.1;
    }

    .subline {
      font-size: 30px;
      font-weight: 400;
      color: rgba(255,255,255,0.8);
      max-width: 1600px;
      line-height: 1.4;
      margin: 0;
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
    }

    .screenshot {
      width: 2400px;
      border-radius: 16px 16px 0 0;
      box-shadow: 0 -10px 60px rgba(0,0,0,0.3), 0 -2px 20px rgba(0,0,0,0.15);
      object-fit: cover;
      object-position: top center;
      /* Ensure it touches the bottom edge */
      display: block;
    }
  </style>
</head>
<body>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  
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

async function main() {
  console.log('Launching browser...')
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 2880, height: 1800 },
    deviceScaleFactor: 1
  })
  const page = await context.newPage()

  for (const config of CONFIGS) {
    console.log(`Processing ${config.locale}/${config.name}...`)

    // Read source image
    const sourcePath = path.join(BASE_DIR, config.source)
    if (!fs.existsSync(sourcePath)) {
      console.error(`Source image not found: ${sourcePath}`)
      continue
    }

    const imageBuffer = fs.readFileSync(sourcePath)
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`

    // Generate HTML
    const html = generateHTML(config, base64Image)

    // Set content and wait
    await page.setContent(html)
    await page.waitForLoadState('networkidle')
    // Extra wait for fonts to fully render
    await page.waitForTimeout(2000)

    // Ensure output directory exists
    const outDir = path.join(OUT_DIR, config.locale)
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }

    // Take screenshot
    const outputPath = path.join(outDir, `${config.name}.png`)
    await page.screenshot({ path: outputPath, type: 'png', omitBackground: true }) // omitBackground: true might help if body has transparency, but we set explicit bg.
    // Actually, omitBackground: false is default (opaque white), but we want our CSS background.
    // Playwright screenshot respects CSS.

    console.log(`Saved to ${outputPath}`)
  }

  await browser.close()
  console.log('Done.')
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
