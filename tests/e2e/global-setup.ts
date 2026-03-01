import MCR from 'monocart-coverage-reports'
import coverageOptions from './coverage-options'

async function globalSetup(): Promise<void> {
  const mcr = MCR(coverageOptions)
  mcr.cleanCache()
}

export default globalSetup
