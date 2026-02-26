import { AppSettings } from '../context/SettingsContext'

export interface AgentOptions {
  profile: string
  jobDescription: string
}

export interface CodingAgent {
  generateCV(options: AgentOptions): AsyncGenerator<string, void, unknown>
}

export class MockAgent implements CodingAgent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
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
      await new Promise((resolve) => setTimeout(resolve, 500))
      yield line
    }
  }
}

export class OpenCodeAgent implements CodingAgent {
  private endpoint: string
  private model: string

  constructor(endpoint: string, model: string) {
    this.endpoint = endpoint
    this.model = model
  }

  async *generateCV(options: AgentOptions): AsyncGenerator<string, void, unknown> {
    const prompt = `Generate a professional CV/resume in Markdown format based on the following:\n\nProfile:\n${options.profile}\n\nJob Description:\n${options.jobDescription}\n\nPlease create a tailored CV that highlights relevant skills and experience.`

    try {
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`OpenCode server returned ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) yield content
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      yield `Failed to connect to OpenCode server at ${this.endpoint}: ${errMsg}\n`
      yield 'Make sure OpenCode is running with `opencode serve --cors`.\n\n'
      yield 'Falling back to mock generation...\n\n'
      yield* new MockAgent().generateCV(options)
    }
  }
}

export class ClaudeCodeAgent implements CodingAgent {
  async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
    // Stub: Real implementation requires IPC to spawn CLI process
    yield 'Claude Code agent integration requires IPC support (coming soon).\n'
    yield 'Falling back to mock generation...\n\n'
    yield* new MockAgent().generateCV(_options)
  }
}

export class CustomCLIAgent implements CodingAgent {
  async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
    // Stub: Real implementation requires IPC to spawn CLI process
    yield 'Custom CLI agent integration requires IPC support (coming soon).\n'
    yield 'Falling back to mock generation...\n\n'
    yield* new MockAgent().generateCV(_options)
  }
}

export class AiderAgent implements CodingAgent {
  async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
    yield 'Aider agent integration requires IPC support (coming soon).\n'
    yield 'Configure: aider --message "prompt" --model X --yes --stream\n\n'
    yield 'Falling back to mock generation...\n\n'
    yield* new MockAgent().generateCV(_options)
  }
}

export class CursorAgent implements CodingAgent {
  async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
    yield 'Cursor agent integration requires IPC support (coming soon).\n'
    yield 'Configure: cursor agent --mode=agent "prompt"\n\n'
    yield 'Falling back to mock generation...\n\n'
    yield* new MockAgent().generateCV(_options)
  }
}

export class CopilotAgent implements CodingAgent {
  async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
    yield 'GitHub Copilot agent integration requires IPC support (coming soon).\n'
    yield 'Configure: gh copilot run "prompt" --auto-approve\n\n'
    yield 'Falling back to mock generation...\n\n'
    yield* new MockAgent().generateCV(_options)
  }
}

export function getAgent(settings: AppSettings): CodingAgent {
  switch (settings.agentType) {
    case 'opencode':
      return new OpenCodeAgent(settings.agentEndpoint, settings.agentModel)
    case 'claude-code':
      return new ClaudeCodeAgent()
    case 'custom-cli':
      return new CustomCLIAgent()
    case 'aider':
      return new AiderAgent()
    case 'cursor':
      return new CursorAgent()
    case 'copilot':
      return new CopilotAgent()
    default:
      return new MockAgent()
  }
}
