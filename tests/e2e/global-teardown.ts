import MCR from 'monocart-coverage-reports'
import coverageOptions from './coverage-options'

async function globalTeardown(): Promise<void> {
  const mcr = MCR(coverageOptions)
  await mcr.generate()
}

export default globalTeardown
