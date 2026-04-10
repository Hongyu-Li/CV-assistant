import path from 'node:path'
import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EngineState } from '../llm'

const { mockSpawn, mockCreateServer, mockFetch } = vi.hoisted(() => {
  return {
    mockSpawn: vi.fn(),
    mockCreateServer: vi.fn(),
    mockFetch: vi.fn()
  }
})

vi.mock('node:child_process', () => {
  return {
    spawn: mockSpawn,
    default: {
      spawn: mockSpawn
    }
  }
})

vi.mock('node:net', () => {
  return {
    createServer: mockCreateServer,
    default: {
      createServer: mockCreateServer
    }
  }
})

type EngineModule = typeof import('../llm/engine')

interface HealthResponse {
  ok: boolean
  status?: number
  json: () => Promise<{ status?: string }>
}

class MockNetServer extends EventEmitter {
  public readonly assignedPort: number

  public closed: boolean

  public constructor(port: number) {
    super()
    this.assignedPort = port
    this.closed = false
  }

  public listen(_port?: number, _host?: string, callback?: () => void): MockNetServer {
    queueMicrotask((): void => {
      callback?.()
      this.emit('listening')
    })
    return this
  }

  public address(): { port: number; address: string; family: string } {
    return {
      port: this.assignedPort,
      address: '127.0.0.1',
      family: 'IPv4'
    }
  }

  public close(callback?: (error?: Error) => void): MockNetServer {
    this.closed = true
    queueMicrotask((): void => {
      callback?.()
      this.emit('close')
    })
    return this
  }
}

class MockChildProcess extends EventEmitter {
  public readonly pid: number

  public readonly stdout: EventEmitter

  public readonly stderr: EventEmitter

  public readonly killSignals: Array<NodeJS.Signals | number | undefined>

  public readonly killImpl: (signal?: NodeJS.Signals | number) => void

  public constructor(options?: {
    pid?: number
    onKill?: (signal?: NodeJS.Signals | number) => void
  }) {
    super()
    this.pid = options?.pid ?? 4321
    this.stdout = new EventEmitter()
    this.stderr = new EventEmitter()
    this.killSignals = []
    this.killImpl = options?.onKill ?? (() => {})
  }

  public kill(signal?: NodeJS.Signals | number): boolean {
    this.killSignals.push(signal)
    this.killImpl(signal)
    return true
  }
}

function mockPortAllocation(...ports: number[]): void {
  mockCreateServer.mockImplementation(() => {
    const nextPort = ports.shift() ?? 49999
    return new MockNetServer(nextPort)
  })
}

function mockHealthyFetch(): void {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async (): Promise<{ status: string }> => ({ status: 'ok' })
  } satisfies HealthResponse)
}

async function loadEngineModule(): Promise<EngineModule> {
  return import('../llm/engine')
}

beforeEach((): void => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.useRealTimers()
  Object.defineProperty(globalThis, 'fetch', {
    value: mockFetch,
    writable: true,
    configurable: true
  })
})

describe('main/llm/engine', (): void => {
  it('findFreePort() returns a port greater than 1024', async (): Promise<void> => {
    mockPortAllocation(41001)

    const engine = await loadEngineModule()
    const port = await engine.findFreePort()

    expect(port).toBeGreaterThan(1024)
  })

  it('findFreePort() returns different ports on consecutive calls', async (): Promise<void> => {
    mockPortAllocation(41001, 41002)

    const engine = await loadEngineModule()
    const firstPort = await engine.findFreePort()
    const secondPort = await engine.findFreePort()

    expect(firstPort).not.toBe(secondPort)
  })

  it('getLlamaServerPath() resolves the correct binary name for the current arch', async (): Promise<void> => {
    const engine = await loadEngineModule()
    const binaryArch = process.arch === 'arm64' ? 'arm64' : 'x86_64'
    const expectedSuffix = path.join('resources', `llama-server-${binaryArch}`)

    expect(path.normalize(engine.getLlamaServerPath())).toContain(expectedSuffix)
  })

  it('startEngine() spawns the child process with the expected args', async (): Promise<void> => {
    mockPortAllocation(41003)
    mockHealthyFetch()
    const child = new MockChildProcess()
    mockSpawn.mockReturnValue(child)

    const engine = await loadEngineModule()

    await engine.startEngine('test-model', '/models/test.gguf')

    const llamaPath = engine.getLlamaServerPath()
    const llamaDir = path.dirname(llamaPath)

    expect(mockSpawn).toHaveBeenCalledWith(
      llamaPath,
      [
        '-m',
        '/models/test.gguf',
        '--host',
        '127.0.0.1',
        '--port',
        '41003',
        '-ngl',
        '99',
        '-c',
        '8192'
      ],
      expect.objectContaining({
        stdio: 'ignore',
        cwd: llamaDir,
        env: expect.objectContaining({
          DYLD_LIBRARY_PATH: llamaDir
        })
      })
    )
  })

  it('startEngine() polls /health and transitions to running', async (): Promise<void> => {
    vi.useFakeTimers()
    mockPortAllocation(41004)
    const child = new MockChildProcess()
    mockSpawn.mockReturnValue(child)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{ status: string }> => ({ status: 'starting' })
      } satisfies HealthResponse)
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{ status: string }> => ({ status: 'ok' })
      } satisfies HealthResponse)

    const engine = await loadEngineModule()
    const startPromise = engine.startEngine('test-model', '/models/test.gguf')

    await vi.advanceTimersByTimeAsync(500)
    const state = await startPromise

    expect(mockFetch).toHaveBeenCalledWith('http://127.0.0.1:41004/health')
    expect(state).toEqual({
      status: 'running',
      port: 41004,
      modelId: 'test-model',
      error: null
    } satisfies EngineState)
    expect(engine.getEngineState()).toEqual(state)
  })

  it('stopEngine() sends SIGTERM and transitions to stopped', async (): Promise<void> => {
    mockPortAllocation(41005)
    mockHealthyFetch()
    const child = new MockChildProcess({
      onKill: (signal?: NodeJS.Signals | number): void => {
        if (signal === 'SIGTERM') {
          queueMicrotask((): void => {
            child.emit('exit', 0, 'SIGTERM')
          })
        }
      }
    })
    mockSpawn.mockReturnValue(child)

    const engine = await loadEngineModule()
    await engine.startEngine('test-model', '/models/test.gguf')

    await engine.stopEngine()

    expect(child.killSignals).toEqual(['SIGTERM'])
    expect(engine.getEngineState()).toEqual({
      status: 'stopped',
      port: null,
      modelId: null,
      error: null
    } satisfies EngineState)
  })

  it('unexpected child exit sets status to error', async (): Promise<void> => {
    mockPortAllocation(41006)
    mockHealthyFetch()
    const child = new MockChildProcess()
    mockSpawn.mockReturnValue(child)

    const engine = await loadEngineModule()
    await engine.startEngine('test-model', '/models/test.gguf')

    child.emit('exit', 2, null)

    expect(engine.getEngineState()).toEqual({
      status: 'error',
      port: null,
      modelId: null,
      error: 'Engine exited with code 2'
    } satisfies EngineState)
  })

  it('startEngine() is idempotent when the engine is already running', async (): Promise<void> => {
    mockPortAllocation(41007)
    mockHealthyFetch()
    const child = new MockChildProcess()
    mockSpawn.mockReturnValue(child)

    const engine = await loadEngineModule()
    const firstState = await engine.startEngine('test-model', '/models/test.gguf')
    const secondState = await engine.startEngine('other-model', '/models/other.gguf')

    expect(secondState).toEqual(firstState)
    expect(mockSpawn).toHaveBeenCalledTimes(1)
  })
})
