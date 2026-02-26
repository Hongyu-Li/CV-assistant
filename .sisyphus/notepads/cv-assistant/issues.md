
### jsdom and window.matchMedia
- **Issue**: When testing components that use `radix-ui` or `sonner` (like shadcn components), jsdom throws `TypeError: window.matchMedia is not a function`.
- **Resolution**: Mock `window.matchMedia` in the test setup file (`App.test.tsx` or a global setup file) using `Object.defineProperty(window, 'matchMedia', ...)`.
