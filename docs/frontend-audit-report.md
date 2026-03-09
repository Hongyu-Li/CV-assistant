# Frontend Quality Audit Report

**Project**: CV Assistant (简历助手)
**Date**: March 9, 2026
**Stack**: Electron 39 + React 19 + TypeScript 5 + Tailwind CSS v4 + shadcn/ui + Radix UI + Tiptap 3
**Scope**: Full renderer-side audit — accessibility, performance, theming, responsive design, UX writing, anti-patterns

---

## Anti-Patterns Verdict: PASS

The codebase is **clean of AI slop**. Zero instances of:

- Glassmorphism / backdrop-blur decorative layers
- Gradient text headings
- Bounce / elastic / spring animations
- Cyan-purple "AI" color palettes
- Hero metric grids with fake numbers
- Card-in-card nesting
- Decorative SVG blobs

The design is tasteful, restrained, and functional. Animations use `transform`/`opacity` (GPU-composited), respect `prefers-reduced-motion`, and follow a consistent stagger pattern (50ms increments, 9-item cap).

---

## Executive Summary

| Severity  | Count  | Key Theme                                              |
| --------- | ------ | ------------------------------------------------------ |
| Critical  | 2      | Form labels inaccessible; keyboard nav broken on cards |
| High      | 10     | Missing ARIA attributes, theme mismatch, touch targets |
| Medium    | 10     | Performance (no memoization), responsive gaps          |
| Low       | 8      | Dead CSS, i18n edge cases, minor token gaps            |
| **Total** | **30** |                                                        |

**The #1 systemic issue is accessibility.** 16 of 30 findings relate to a11y. The app's visual design is solid, but screen reader and keyboard-only users face a fundamentally broken experience. The good news: these are all mechanical fixes — the architecture supports proper a11y, it just hasn't been wired up.

---

## Critical Issues

### C1. All form labels missing `htmlFor`/`id` association

**Files**: `Profile.tsx` (11 labels), `ResumeDialog.tsx` (8 labels), `Settings.tsx` (7 labels)
**Impact**: Every form field in the app is unnamed to screen readers. Clicking a `<Label>` does not focus its input. Violates WCAG 1.3.1 (Info and Relationships) and 4.1.2 (Name, Role, Value).
**Evidence**: 0 matches for `htmlFor` across all TSX files. 0 matches for `aria-label` on inputs. 0 matches for `aria-describedby`.
**Fix command**: `/harden` — add `htmlFor`+`id` pairs to all 26 label-input associations.

### C2. Resume cards are clickable `<div>`s with no keyboard support

**File**: `Resumes.tsx:135-205`
**Impact**: `<Card>` elements have `onClick` handlers but no `role="button"`, `tabIndex={0}`, or `onKeyDown` handler. Keyboard-only users cannot navigate to or activate resume cards. Violates WCAG 2.1.1 (Keyboard).
**Fix command**: `/harden` — add `role="button"`, `tabIndex={0}`, and `onKeyDown` (Enter/Space) to each card, or convert to `<button>` elements.

---

## High Issues

### H1. `<html>` missing `lang` attribute

**File**: `src/renderer/index.html:2`
**Impact**: The app supports English and Chinese but the HTML root has no `lang` attribute. Screen readers cannot determine page language, leading to incorrect pronunciation of all content. Violates WCAG 3.1.1 (Language of Page), Level A.
**Fix**: Add `lang="en"` as default. Update dynamically in `SettingsContext` when `settings.language` changes via `document.documentElement.lang = settings.language`.
**Fix command**: `/harden`

### H2. Icon-only buttons use `title` not `aria-label`

**Files**: `ResumeDialog.tsx:328-338` (Copy, Export buttons), `Settings.tsx:278-286` (Show/Hide API key)
**Impact**: `title` attributes are not reliably announced by screen readers (VoiceOver ignores them in many contexts). These buttons have no accessible name. Additionally, the API key toggle is missing `aria-pressed` to convey its state.
**Fix command**: `/harden`

### H3. Delete button invisible to keyboard users

**File**: `Resumes.tsx:192-202`
**Impact**: The delete button uses `opacity-0 group-hover:opacity-100`, making it visible only on mouse hover. A keyboard user who tabs to it sees nothing. Violates WCAG 2.4.11 (Focus Not Obscured).
**Fix**: Add `focus:opacity-100` and `group-focus-within:opacity-100` classes.
**Fix command**: `/harden`

### H4. Decorative icons not hidden from screen readers

**Files**: `App.tsx` (nav icons: `<User>`, `<FileText>`, `<SettingsIcon>`, `<Sparkles>`), `Resumes.tsx` (card icons: `<Calendar>`, `<Building2>`, `<Briefcase>`, `<FileText>`), `ResumeDialog.tsx:314` (`<Loader2>` spinner)
**Impact**: Lucide icons render as inline SVGs without `aria-hidden="true"`. Screen readers announce them as meaningless image content, cluttering the experience.
**Fix command**: `/harden` — add `aria-hidden="true"` to all decorative icons.

### H5. Nav buttons missing `aria-current="page"`

**File**: `App.tsx:31,39,47`
**Impact**: Active navigation state is conveyed only through CSS background color. Screen readers have no way to determine which page is active. Violates WCAG 1.3.1.
**Fix command**: `/harden`

### H6. No inline validation — toast-only error feedback

**Files**: `ResumeDialog.tsx:181`, `Profile.tsx`, `Settings.tsx`
**Impact**: All form validation uses `toast.error()` exclusively. No fields have `aria-required`, `aria-invalid`, or `aria-describedby` for error messages. Toast notifications are ephemeral and not reliably announced to assistive technology. The required "Job Title" field in ResumeDialog is not marked as required. Violates WCAG 3.3.1 (Error Identification).
**Fix command**: `/harden`

### H7. `sonner.tsx` imports `next-themes` instead of app's theme system

**File**: `src/renderer/src/components/ui/sonner.tsx:1`
**Impact**: The toast component imports `useTheme` from `next-themes`, but the app manages themes via `SettingsContext`. This means toasts always render in system theme mode, ignoring the user's explicit light/dark preference. If a user selects "dark" but their OS is in light mode, toasts appear in light theme.
**Fix**: Replace `useTheme` from `next-themes` with `useSettings()` from `SettingsContext`.
**Fix command**: `/normalize`

### H8. System theme detection is a snapshot, not reactive

**File**: `SettingsContext.tsx:67-79`
**Impact**: `window.matchMedia('(prefers-color-scheme: dark)')` is read once on mount. No `addEventListener('change', ...)` listener is registered. When the OS switches between light and dark mode (e.g., scheduled sunset transition), the app does not respond until restarted.
**Fix**: Add a `matchMedia` change listener in the existing `useEffect` and clean it up on unmount.
**Fix command**: `/harden`

### H9. Touch targets below 44px minimum

**Files**: `ui/button.tsx` (sm: 32px, default: 36px, icon: 36px), `ui/input.tsx` (36px), `ui/select.tsx` (36px)
**Impact**: All interactive elements are 18–27% below the recommended 44px minimum touch target (WCAG 2.5.8, AAA). This affects usability on touchscreen devices and for users with motor impairments.
**Fix command**: `/harden` — increase minimum heights to 40px (pragmatic) or 44px (ideal).

### H10. `CardTitle` renders as `<div>` not a heading element

**File**: `ui/card.tsx:23-31`
**Impact**: Card section titles use `<div>` instead of a heading element (`<h2>`, `<h3>`), breaking the document heading hierarchy. Additionally, no `<h1>` exists anywhere in the app — all headings effectively start at an implicit level. Screen readers' heading navigation is useless.
**Fix command**: `/normalize` — render `CardTitle` as configurable heading level, add an `<h1>` to each page view.

---

## Medium Issues

### M1. No memoization across most components

**Files**: `Profile.tsx` (7 handlers), `ResumeDialog.tsx` (4 handlers), `Resumes.tsx`, `Settings.tsx`
**Impact**: Only 1 `useCallback` exists in the entire app (Resumes.tsx:19). Zero `useMemo`. Zero `React.memo`. In `Profile.tsx`, 7 handler functions are recreated every render, each passing new function references to `MarkdownEditor` components containing full Tiptap editor instances, potentially causing unnecessary re-initialization.
**Fix command**: `/optimize`

### M2. Nine individual `useState` calls in ResumeDialog

**File**: `ResumeDialog.tsx:54-63`
**Impact**: Nine separate `useState` calls manage tightly coupled form state. This increases re-render surface area (each setter triggers a render) and makes the component harder to reason about. A `useReducer` or form library would consolidate updates.
**Fix command**: `/optimize`

### M3. `key={currentView}` unmounts entire page trees on tab switch

**File**: `App.tsx:57`
**Impact**: Switching between Profile, Resumes, and Settings destroys and recreates the entire component tree, including heavyweight Tiptap editor instances. User's unsaved in-progress edits and scroll position are lost.
**Fix**: Use CSS visibility toggling or conditional rendering without `key` prop to preserve component state across tab switches.
**Fix command**: `/optimize`

### M4. Status badges use hard-coded Tailwind palette colors

**File**: `Resumes.tsx:152-153`
**Impact**: `bg-green-100 text-green-700` and `bg-yellow-100 text-yellow-700` bypass the app's HSL design token system. No `--success` or `--warning` semantic tokens exist. These colors won't adapt to dark mode correctly.
**Fix command**: `/normalize` or `/colorize` — define `--success` and `--warning` tokens in `main.css` and use them.

### M5. Card hover shadow uses hard-coded `rgb(0 0 0 / 0.1)`

**File**: `main.css:224-225`
**Impact**: A black shadow on near-black dark mode backgrounds is invisible, making the hover effect disappear in dark mode. Should use a theme-aware shadow token.
**Fix command**: `/colorize`

### M6. Suppressed `exhaustive-deps` with stale closure risk

**File**: `Settings.tsx:103-120`
**Impact**: `handleMigration` closes over `settings.workspacePath` but is excluded from the dependency array via `eslint-disable-next-line`. If the user changes the workspace path rapidly, the migration handler could operate on a stale path value.
**Fix command**: `/harden`

### M7. `t` function in `useEffect` dependency causes unnecessary disk reads

**File**: `Profile.tsx:53-71`
**Impact**: The `t` translation function from `useTranslation()` is included in a `useEffect` dependency array that loads profile data from disk. Changing the app language triggers a full profile data reload, which is unnecessary (the data hasn't changed, only the UI labels).
**Fix command**: `/optimize`

### M8. No skip-navigation link

**Impact**: Keyboard users must Tab through all sidebar navigation items (3 buttons + theme toggle) before reaching page content on every page change. A skip-nav link would let them jump directly to the main content area.
**Fix command**: `/harden`

### M9. Sidebar is fixed `w-64` with no responsive collapse

**File**: `App.tsx:22`
**Impact**: The sidebar occupies 256px (28% of a 900px window) at all sizes. No breakpoint-based collapse, hamburger menu, or responsive behavior exists. On narrow windows, the content area becomes cramped.
**Fix command**: `/adapt`

### M10. Inline objects created every render

**Files**: `MarkdownEditor.tsx:78` (`style={{ minHeight }}`), `sonner.tsx:13-21` (`toastOptions` object)
**Impact**: New object references created every render cause unnecessary prop comparison failures. In `sonner.tsx`, the entire `toastOptions` object contains only static values but is recreated on each render.
**Fix command**: `/optimize`

---

## Low Issues

### L1. Google Fonts loaded via CSS `@import` (render-blocking)

**File**: `src/renderer/src/assets/base.css:1`
**Impact**: CSS `@import` blocks rendering until the font stylesheet is fetched. In an Electron app that may run offline, this could delay initial paint or fail silently. Self-hosting the font files would be more reliable.

### L2. Dialog overlay uses raw `bg-black/80`

**File**: `ui/dialog.tsx:18`
**Impact**: Hard-coded black instead of a theme-aware scrim token. Minor visual inconsistency with the rest of the token-based system.

### L3. Empty `<CardDescription>` renders empty `<p>` tag

**File**: `Settings.tsx:164`
**Impact**: Renders `<CardDescription></CardDescription>` which produces an empty `<p>` element in the DOM. Semantically meaningless and could confuse screen readers that announce empty paragraphs.

### L4. Unused animation keyframes

**File**: `main.css`
**Impact**: `animate-fade-in-blur`, `animate-scale-in`, `animate-scale-out` are defined but never referenced by any component class. Dead CSS adds (marginal) weight.

### L5. Translation string has trailing colon with no following content

**File**: `src/renderer/src/locales/en.json:106`
**Impact**: `profile.save_error` value is `"Failed to save profile: "` — when the error detail is empty, the user sees a dangling colon: "Failed to save profile: ".

### L6. Mixed-language toast messages

**File**: `Settings.tsx:327,331`
**Impact**: Chinese translated string is concatenated with a raw English error message (from the system). Users see: "设置保存失败: [English error text]". Should either translate the error or separate the translatable prefix from the raw detail.

### L7. Dialog description reuses page-level copy

**File**: `ResumeDialog.tsx`
**Impact**: `DialogDescription` contains "Manage your CV drafts..." which describes the Resumes page, not the specific dialog action (viewing/editing a resume). Misleading for screen reader users who rely on dialog descriptions.

### L8. Dead i18n keys

**Files**: `en.json`, `zh.json`
**Impact**: Keys `profile.location`, `profile.website`, `profile.loading`, `resumes.loading` are defined in both translation files but never rendered in any component. Maintenance overhead.

---

## Systemic Patterns

### Pattern 1: Accessibility is structurally absent

This isn't a case of "a few missed attributes." The codebase has **zero** `htmlFor`, **zero** `aria-label` on inputs, **zero** `aria-describedby`, **zero** `aria-current`, and **zero** `aria-hidden` on decorative icons. ARIA attributes exist only in shadcn/ui primitives (Radix handles dialog/switch automatically). Every custom component lacks accessibility affordances.

**Root cause**: No a11y linting (`eslint-plugin-jsx-a11y` is not configured), no screen reader testing.
**Recommendation**: Add `eslint-plugin-jsx-a11y` to catch these at author time. Fix all Critical and High a11y issues via `/harden`.

### Pattern 2: No performance optimization patterns

1 `useCallback` in the entire app. 0 `useMemo`. 0 `React.memo`. For an app with heavyweight Tiptap editors and multiple form-heavy views, this means every keystroke or state change triggers full re-render cascades through the component tree.

**Root cause**: Small app that "feels fast enough" — but Tiptap editors are expensive to re-render.
**Recommendation**: Profile with React DevTools to identify actual bottlenecks, then apply `/optimize` selectively.

### Pattern 3: Theme system is 95% complete but leaks

The HSL token system in `main.css` is well-structured with proper `.dark` overrides. But 3 spots leak: status badges use raw Tailwind colors (M4), card hover uses raw rgb (M5), and the toast component imports a different theme system entirely (H7). These create visible dark-mode bugs.

**Recommendation**: `/normalize` to close the remaining 5%.

---

## Positive Findings

These aspects of the codebase are well-executed and should be preserved:

- **Design token architecture**: Complete HSL-based 2-layer system in `main.css` with proper `.dark` class overrides. Clean separation of semantic tokens.
- **Animation discipline**: `prefers-reduced-motion` respected for all custom animations. All keyframes use `transform`/`opacity` (GPU-composited). Consistent stagger pattern with sensible 9-item cap.
- **Radix Dialog accessibility**: Focus trap, Escape key dismiss, `aria-modal`, sr-only close button text — all correct out of the box.
- **Switch component**: Properly uses `role="switch"` with `aria-checked` — correct semantic.
- **No layout thrashing**: Zero DOM measurement calls (`getBoundingClientRect`, `offsetHeight`, etc.) in render paths.
- **i18n architecture**: Well-structured key naming, complete coverage in both `en.json` and `zh.json`, proper `useTranslation()` usage throughout.
- **Utility setup**: `cn()` helper with `clsx` + `tailwind-merge` is properly configured and used consistently.
- **AI slop free**: The visual design is original, restrained, and functional. No trendy gimmicks.

---

## Recommendations by Priority

### Immediate (before next release)

| #   | Action                                      | Issues Addressed | Command      |
| --- | ------------------------------------------- | ---------------- | ------------ |
| 1   | Add `htmlFor`/`id` to all label-input pairs | C1               | `/harden`    |
| 2   | Make resume cards keyboard-accessible       | C2               | `/harden`    |
| 3   | Add `lang` attribute to `<html>`            | H1               | `/harden`    |
| 4   | Fix sonner.tsx theme import                 | H7               | `/normalize` |
| 5   | Add `aria-hidden` to all decorative icons   | H4               | `/harden`    |

### Short-term (next 1–2 sprints)

| #   | Action                                            | Issues Addressed | Command      |
| --- | ------------------------------------------------- | ---------------- | ------------ |
| 6   | Replace `title` with `aria-label` on icon buttons | H2               | `/harden`    |
| 7   | Add focus-visible styles to hidden delete button  | H3               | `/harden`    |
| 8   | Add `aria-current="page"` to nav                  | H5               | `/harden`    |
| 9   | Add inline validation + `aria-invalid`            | H6               | `/harden`    |
| 10  | Add `matchMedia` change listener                  | H8               | `/harden`    |
| 11  | Increase touch targets to 40px+                   | H9               | `/harden`    |
| 12  | Make `CardTitle` a heading element                | H10              | `/normalize` |

### Medium-term (next month)

| #   | Action                                      | Issues Addressed   | Command     |
| --- | ------------------------------------------- | ------------------ | ----------- |
| 13  | Add `eslint-plugin-jsx-a11y`                | Systemic Pattern 1 | `/harden`   |
| 14  | Define `--success`/`--warning` tokens       | M4, M5             | `/colorize` |
| 15  | Remove `key={currentView}` pattern          | M3                 | `/optimize` |
| 16  | Add skip-navigation link                    | M8                 | `/harden`   |
| 17  | Add responsive sidebar collapse             | M9                 | `/adapt`    |
| 18  | Profile and memoize hot paths               | M1, M2, M10        | `/optimize` |
| 19  | Fix stale closure in Settings               | M6                 | `/harden`   |
| 20  | Remove `t` from data-loading useEffect deps | M7                 | `/optimize` |

### Low priority (backlog)

| #   | Action                             | Issues Addressed | Command      |
| --- | ---------------------------------- | ---------------- | ------------ |
| 21  | Self-host Google Fonts             | L1               | `/optimize`  |
| 22  | Replace `bg-black/80` with token   | L2               | `/normalize` |
| 23  | Remove empty CardDescription       | L3               | `/polish`    |
| 24  | Remove unused animation keyframes  | L4               | `/polish`    |
| 25  | Fix trailing colon in error string | L5               | `/clarify`   |
| 26  | Separate translated/raw error text | L6               | `/clarify`   |
| 27  | Fix dialog description copy        | L7               | `/clarify`   |
| 28  | Remove dead i18n keys              | L8               | `/polish`    |

---

## Summary

The CV Assistant has a **solid visual foundation** — clean design, good token architecture, proper animation discipline, and zero AI slop. The primary gap is **accessibility**, which is structurally absent from custom components (while Radix primitives handle their own a11y correctly). A focused `/harden` pass addressing the Critical and High issues would bring the app to a reasonable baseline. Performance optimization is a secondary concern — the app is small enough that most issues are theoretical, though the `key={currentView}` pattern (M3) is the one with real user-facing impact (lost editor state on tab switch).

**Estimated effort**: Critical + High fixes: ~2-3 days. Medium fixes: ~3-4 days. Low fixes: ~1 day.
