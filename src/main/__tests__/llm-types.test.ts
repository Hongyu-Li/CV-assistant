import { describe, it, expect } from 'vitest'

describe('llm/types', (): void => {
  it('exports AVAILABLE_MODELS with exactly 2 entries', async (): Promise<void> => {
    const { AVAILABLE_MODELS } = await import('../llm/types')
    expect(AVAILABLE_MODELS).toHaveLength(2)
  })

  it('each model has all required fields with valid values', async (): Promise<void> => {
    const { AVAILABLE_MODELS } = await import('../llm/types')
    for (const model of AVAILABLE_MODELS) {
      expect(model.id).toBeTruthy()
      expect(typeof model.id).toBe('string')
      expect(model.name).toBeTruthy()
      expect(model.displayName).toBeTruthy()
      expect(model.repo).toMatch(/^[\w-]+\/[\w.-]+$/)
      expect(model.filename).toMatch(/\.gguf$/)
      expect(model.size).toBeGreaterThan(0)
      expect(model.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(model.quantization).toBeTruthy()
      expect(model.description).toBeTruthy()
    }
  })

  it('exports EngineStatus type values as a union', async (): Promise<void> => {
    const mod = await import('../llm/types')
    expect(mod).toHaveProperty('AVAILABLE_MODELS')
  })

  it('model IDs are unique', async (): Promise<void> => {
    const { AVAILABLE_MODELS } = await import('../llm/types')
    const ids = AVAILABLE_MODELS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
