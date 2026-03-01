import path from 'path'

const coverageOptions = {
  outputDir: path.resolve(process.cwd(), 'coverage-e2e'),
  reports: [['console-summary'], ['v8'], ['lcovonly']],
  sourceFilter: (sourcePath: string): boolean => {
    // Only report coverage for renderer source files
    return sourcePath.includes('src/renderer/src/')
  }
}

export default coverageOptions
