## [2026-02-28] Task 1: Promotional Screenshot Generation

- Script location: tests/screenshots/generate-promotional.mjs
- Output: tests/screenshots/app-store/{zh,en}/
- Apple spec: 2880×1800, PNG, no alpha
- Fonts: Google Fonts CDN (Inter + Noto Sans SC), needs networkidle + 2s delay
- Alpha stripping: Playwright `omitBackground: true` + opaque CSS background resulted in `hasAlpha: no` files directly. No post-processing needed.
- Note: `sips --setProperty hasAlpha no` failed with Error 13, but was unnecessary as files were already opaque.
