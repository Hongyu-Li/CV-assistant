## Task 9: CV Generation UI & Orchestration

- Created `src/renderer/src/lib/ai.ts` with a mock AI provider as the original abstraction was missing.
- Implemented `Generator` component with split-pane view for job description and generated CV.
- Integrated `Generator` into `App.tsx` with navigation.
- Encountered and fixed duplicate code in `SettingsContext.tsx`.
- Used `AsyncGenerator` for streaming response simulation in the mock provider.
- Verified with `vitest` and `eslint`.
