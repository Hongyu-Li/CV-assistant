import { AppSettings } from '../context/SettingsContext'

export interface GenerateOptions {
  profile: string
  jobDescription: string
  model?: string
  apiKey?: string
}

export interface AIProvider {
  generateCV(options: GenerateOptions): AsyncGenerator<string, void, unknown>
}

export class MockAIProvider implements AIProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *generateCV(_options: GenerateOptions): AsyncGenerator<string, void, unknown> {
    const lines = [
      '# Generated CV\n\n',
      '## Professional Summary\n',
      'Highly motivated software engineer with experience in React and Electron.\n\n',
      '## Experience\n',
      '- **Senior Developer** at Tech Corp (2020-Present)\n',
      '  - Built amazing apps using modern tech stack.\n',
      '- **Junior Developer** at StartUp Inc (2018-2020)\n',
      '  - Learned the ropes of software development.\n\n',
      '## Education\n',
      '- BS in Computer Science, University of Technology\n'
    ]

    for (const line of lines) {
      await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate network delay
      yield line
    }
  }
}

export class OpenAIProvider implements AIProvider {
  async *generateCV(options: GenerateOptions): AsyncGenerator<string, void, unknown> {
    // TODO: Implement OpenAI integration
    yield 'OpenAI integration not implemented yet. Using Mock.\n'
    yield* new MockAIProvider().generateCV(options)
  }
}

export class AnthropicProvider implements AIProvider {
  async *generateCV(options: GenerateOptions): AsyncGenerator<string, void, unknown> {
    // TODO: Implement Anthropic integration
    yield 'Anthropic integration not implemented yet. Using Mock.\n'
    yield* new MockAIProvider().generateCV(options)
  }
}

export function getAIProvider(settings: AppSettings): AIProvider {
  switch (settings.provider) {
    case 'openai':
      return new OpenAIProvider()
    case 'anthropic':
      return new AnthropicProvider()
    default:
      return new MockAIProvider()
  }
}
