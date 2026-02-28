# App Store Promotional Screenshots

## TL;DR

> **Quick Summary**: Generate promotional Mac App Store screenshots with marketing text overlays, gradient backgrounds, and embedded app screenshots — 2 localized sets (Chinese + English), 2 screenshots each = 4 total images.
>
> **Deliverables**:
>
> - `tests/screenshots/app-store/zh/01-profile.png` — Chinese Profile promotional screenshot
> - `tests/screenshots/app-store/zh/02-resumes.png` — Chinese Resumes promotional screenshot
> - `tests/screenshots/app-store/en/01-profile.png` — English Profile promotional screenshot
> - `tests/screenshots/app-store/en/02-resumes.png` — English Resumes promotional screenshot
> - `tests/screenshots/generate-promotional.mjs` — Reusable generation script
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 1 wave (single script generates all)
> **Critical Path**: Create script → Run script → Verify output

---

## Context

### Original Request

User wants Mac App Store "App Preview and Screenshots" in both Chinese and English, using 4 real desktop screenshots they provided. User chose **promotional style with text overlays** over clean screenshots.

### Source Screenshots

Already copied to `tests/screenshots/app-store/base/`:

- `zh-profile-raw.png` (3004×1826) — Chinese Profile page
- `zh-resumes-raw.png` (3016×1826) — Chinese Resumes page
- `en-profile-raw.png` (3008×1828) — English Profile page
- `en-resumes-raw.png` (3010×1826) — English Resumes page

All are Retina (144 DPI) with alpha channel (macOS window shadow).

### Apple Requirements (Researched)

- **Accepted sizes**: 1280×800, 1440×900, 2560×1600, **2880×1800** (Retina) ← target
- **Format**: PNG (preferred), no transparency/alpha allowed
- **Max**: 10 per localization
- **Overlays**: Promotional text, device frames, and backgrounds explicitly allowed
- **Single Mac slot**: No per-device-size variants needed

### Technical Approach

Use **Playwright** (already a devDependency) to render an HTML template at exactly 2880×1800:

- HTML template with teal gradient background (matching app accent #438e82)
- Embedded app screenshot with rounded corners and drop shadow
- Marketing headline + subline text at top
- Feature badge pill
- Google Fonts: Inter + Noto Sans SC for bilingual support

This avoids adding any new npm dependencies (constraint from AGENTS.md).

---

## Work Objectives

### Core Objective

Generate 4 promotional PNG screenshots at 2880×1800 for Mac App Store submission in two localizations.

### Concrete Deliverables

- 4 PNG files (2 zh + 2 en) in `tests/screenshots/app-store/{locale}/`
- 1 reusable Playwright generation script at `tests/screenshots/generate-promotional.mjs`

### Definition of Done

- [x] `sips -g pixelWidth -g pixelHeight` on each output → 2880×1800
- [x] `sips -g hasAlpha` on each output → `no`
- [x] All 4 PNG files exist and are > 500KB each
- [x] Visual inspection shows: gradient background, promotional text, embedded app screenshot

### Must Have

- Exactly 2880×1800 pixel output (Apple Retina Mac requirement)
- No alpha channel (Apple rejects transparency)
- Chinese + English localized text overlays
- Teal gradient background matching app accent color (#438e82 / #1a6b6a range)
- App screenshot embedded with rounded corners and shadow
- Professional typography (Inter + Noto Sans SC)

### Must NOT Have (Guardrails)

- No new npm dependencies in package.json (use Playwright which is already installed)
- No fabricated features — text must describe real app capabilities
- No iOS-style screenshots (portrait, phone frames, etc.)
- No transparent backgrounds in final output

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision

- **Infrastructure exists**: YES (Vitest + Playwright)
- **Automated tests**: None — this is a one-off asset generation task
- **Framework**: N/A

### QA Policy

Every task includes agent-executed verification via bash commands and visual inspection.
Evidence saved to `.sisyphus/evidence/`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Single task — script + generate + verify):
└── Task 1: Create promotional screenshot generator + run it + verify output [visual-engineering]

Wave FINAL (After Task 1):
└── Task F1: Visual inspection of all 4 screenshots [quick]
```

### Dependency Matrix

- **1**: None — can start immediately
- **F1**: Depends on Task 1

### Agent Dispatch Summary

- **Wave 1**: 1 task → `visual-engineering`
- **FINAL**: 1 task → `quick`

---

## TODOs

- [x] 1. Create Promotional Screenshot Generator Script + Generate All Screenshots

  **What to do**:
  1. Create `tests/screenshots/generate-promotional.mjs` — an ESM Node.js script that:
     - Uses Playwright (chromium) to render HTML templates
     - Each template is a self-contained HTML page at exactly 2880×1800 viewport
     - Template design:
       - **Background**: Teal gradient (`linear-gradient(145deg, #1a3a4a 0%, #1e4d5c 20%, #1a6b6a 50%, #2d8a7e 75%, #3aaa96 100%)`)
       - **Decorative elements**: Subtle radial gradient orbs for depth, semi-transparent
       - **Text area** (top section, ~400px):
         - Feature badge pill: frosted glass style (`rgba(255,255,255,0.15)` background, border, rounded, ~26px font)
         - Headline: 72px, weight 800, white, slight text-shadow
         - Subline: 30px, weight 400, white at 80% opacity
       - **Screenshot area** (bottom section, fills remaining space):
         - App screenshot image embedded as base64 data URI
         - `border-radius: 16px 16px 0 0` (rounded top corners, flat bottom extending to edge)
         - Drop shadow: `0 -10px 60px rgba(0,0,0,0.3)`
         - Width: ~2400px centered
         - Object-fit: cover, object-position: top center (to crop window shadow)
       - **Fonts**: Import Inter + Noto Sans SC from Google Fonts
     - Reads each raw screenshot from `tests/screenshots/app-store/base/`
     - Converts to base64 data URI for embedding in HTML
     - Renders with Playwright chromium at 2880×1800 viewport, deviceScaleFactor=1
     - Waits for fonts (`networkidle` + 2s delay)
     - Saves PNG to output directories

  2. The script has these **4 screenshot configurations**:

     **Chinese (zh):**
     | # | File | Source | Headline | Subline | Badge |
     |---|------|--------|----------|---------|-------|
     | 1 | `zh/01-profile.png` | `zh-profile-raw.png` | 智能个人档案管理 | 完善个人资料，为 AI 简历生成提供基础 | 支持 Markdown 编辑 |
     | 2 | `zh/02-resumes.png` | `zh-resumes-raw.png` | AI 赋能简历生成 | 基于个人档案 + 职位描述，一键生成定制简历 | 支持 12 家 AI 服务商 |

     **English (en):**
     | # | File | Source | Headline | Subline | Badge |
     |---|------|--------|----------|---------|-------|
     | 1 | `en/01-profile.png` | `en-profile-raw.png` | Smart Profile Management | Build your professional profile as the foundation for AI-generated resumes | Markdown Editor |
     | 2 | `en/02-resumes.png` | `en-resumes-raw.png` | AI-Powered Resume Generation | Generate tailored CVs from your profile + job descriptions in one click | 12 AI Providers |

  3. Run the script: `node tests/screenshots/generate-promotional.mjs`
  4. Verify all outputs exist and meet Apple specs

  **Must NOT do**:
  - Do NOT add sharp, jimp, canvas, or any other npm dependency to package.json
  - Do NOT use require() — the script must be ESM (.mjs)
  - Do NOT use `@ts-ignore` or `as any`
  - Do NOT include fabricated features in promotional text
  - Do NOT output JPEG — must be PNG
  - Do NOT include alpha channel in output

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: This is a visual design + asset generation task with HTML/CSS rendering
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Needed for creating a polished promotional layout with gradient, typography, and visual composition
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — this is simple Playwright API usage (page.setContent + screenshot), not browser automation testing
    - `webapp-testing`: Not testing a webapp

  **Parallelization**:
  - **Can Run In Parallel**: NO (single task)
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Task F1
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `tests/screenshots/app-store-screenshots.spec.ts` — Existing Playwright screenshot script showing how to launch Electron, set viewport, and capture. The new script uses pure Playwright (no Electron) with `page.setContent()` for HTML rendering instead.
  - `tests/screenshots/app-store/base/` — Directory containing the 4 raw screenshots to embed

  **Source Screenshots** (already in base/):
  - `tests/screenshots/app-store/base/zh-profile-raw.png` (3004×1826) — Chinese Profile
  - `tests/screenshots/app-store/base/zh-resumes-raw.png` (3016×1826) — Chinese Resumes
  - `tests/screenshots/app-store/base/en-profile-raw.png` (3008×1828) — English Profile
  - `tests/screenshots/app-store/base/en-resumes-raw.png` (3010×1826) — English Resumes

  **App Design Context** (for matching visual style):
  - App accent color: Teal ~#438e82 / #3d7a70
  - App name: "简历助手" (zh) / "CV Assistant" (en)
  - App layout: Two-pane — left sidebar + right content area, white backgrounds
  - Features to highlight: AI resume generation, 12 AI providers, Markdown editor, profile management

  **External References**:
  - Apple Mac App Store screenshot specs: 2880×1800 Retina, PNG, no alpha, landscape only
  - Google Fonts API: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;600;700;800`

  **WHY Each Reference Matters**:
  - `app-store-screenshots.spec.ts` — Shows existing Playwright screenshot patterns in this project (viewport setup, output directory conventions)
  - `base/` screenshots — The actual source images to embed as base64 data URIs
  - App design context — Ensures the promotional gradient and colors feel cohesive with the app's own teal accent

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All 4 promotional screenshots generated at correct dimensions
    Tool: Bash
    Preconditions: Script has been created and executed
    Steps:
      1. Run: node tests/screenshots/generate-promotional.mjs
      2. Run: sips -g pixelWidth -g pixelHeight tests/screenshots/app-store/zh/01-profile.png
      3. Run: sips -g pixelWidth -g pixelHeight tests/screenshots/app-store/zh/02-resumes.png
      4. Run: sips -g pixelWidth -g pixelHeight tests/screenshots/app-store/en/01-profile.png
      5. Run: sips -g pixelWidth -g pixelHeight tests/screenshots/app-store/en/02-resumes.png
    Expected Result: All 4 files show pixelWidth: 2880, pixelHeight: 1800
    Failure Indicators: Any dimension mismatch or missing file
    Evidence: .sisyphus/evidence/task-1-dimensions.txt

  Scenario: No alpha channel in output (Apple requirement)
    Tool: Bash
    Preconditions: Screenshots generated
    Steps:
      1. Run: for f in tests/screenshots/app-store/zh/*.png tests/screenshots/app-store/en/*.png; do echo "$(basename $f):"; sips -g hasAlpha "$f" | grep hasAlpha; done
    Expected Result: All files show "hasAlpha: no"
    Failure Indicators: Any file shows "hasAlpha: yes"
    Evidence: .sisyphus/evidence/task-1-alpha-check.txt

  Scenario: Files are substantial size (not empty/corrupt)
    Tool: Bash
    Preconditions: Screenshots generated
    Steps:
      1. Run: ls -la tests/screenshots/app-store/zh/*.png tests/screenshots/app-store/en/*.png
    Expected Result: All files > 500KB (500000 bytes)
    Failure Indicators: Any file < 500KB or missing
    Evidence: .sisyphus/evidence/task-1-file-sizes.txt

  Scenario: Visual verification — screenshots have promotional layout
    Tool: Bash (look_at / screenshot analysis)
    Preconditions: Screenshots generated
    Steps:
      1. Open each of the 4 generated screenshots using look_at tool
      2. Verify: teal gradient background visible
      3. Verify: marketing headline text visible at top
      4. Verify: badge pill visible
      5. Verify: app screenshot embedded in lower portion with rounded corners
      6. Verify: Chinese screenshots have Chinese text, English have English text
    Expected Result: All 4 screenshots show professional promotional layout with correct locale text
    Failure Indicators: Missing text, wrong language, broken layout, no screenshot visible, white/blank areas
    Evidence: .sisyphus/evidence/task-1-visual-verification.md
  ```

  **Note on alpha**: Playwright's PNG output includes alpha by default. After generating, the script should flatten alpha by either:
  - Using `sips --setProperty format png --deleteProperty hasAlpha` if supported, OR
  - Rendering the HTML with an explicit white/opaque background (no transparency in the CSS), OR
  - Post-processing with: `sips -s format png --setProperty hasAlpha no` on each output

  The HTML template uses solid `background` (no `transparent`), so Playwright should produce opaque pixels. But verify and fix if needed.

  **Commit**: NO (asset generation, not code feature)

---

## Final Verification Wave

- [x] F1. **Visual Quality Check** — `quick`
      Open all 4 generated screenshots with look_at. Verify:
  1. Professional appearance — gradient smooth, text crisp, screenshot well-framed
  2. Correct locale — zh files have Chinese text, en files have English text
  3. No visual glitches — no clipping, no missing fonts, no broken images
  4. Screenshot content matches source — Profile page in profile screenshots, Resumes in resumes screenshots
  5. Report any issues for fixing before App Store upload
     Output: `Visual [4/4 pass] | Locale [4/4 correct] | Quality [PASS/FAIL] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

- No git commit needed — these are generated assets for App Store submission, not source code

---

## Success Criteria

### Verification Commands

```bash
# Dimensions check (all should be 2880×1800)
for f in tests/screenshots/app-store/{zh,en}/*.png; do echo "$(basename $f):"; sips -g pixelWidth -g pixelHeight "$f" | grep pixel; done

# Alpha check (all should be no)
for f in tests/screenshots/app-store/{zh,en}/*.png; do echo "$(basename $f):"; sips -g hasAlpha "$f" | grep hasAlpha; done

# File count (should be 4)
find tests/screenshots/app-store -name "*.png" -not -path "*/base/*" | wc -l
```

### Final Checklist

- [ ] 4 PNG files at 2880×1800 exist
- [ ] No alpha channel on any file
- [ ] Chinese screenshots have Chinese promotional text
- [ ] English screenshots have English promotional text
- [ ] Visual quality is professional and App Store-ready
