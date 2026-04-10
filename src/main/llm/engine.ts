import path from 'node:path'
import { EventEmitter } from 'node:events'
import * as childProcess from 'node:child_process'
import * as net from 'node:net'

import type { ChildProcess } from 'node:child_process'

import type { EngineState } from './types'

const HEALTH_CHECK_INTERVAL_MS = 500
const HEALTH_CHECK_TIMEOUT_MS = 60_000
const STOP_TIMEOUT_MS = 5_000

const stateEvents = new EventEmitter()

let engineProcess: ChildProcess | null = null
let currentStartPromise: Promise<EngineState> | null = null
let stopTimer: NodeJS.Timeout | null = null
let stopResolver: (() => void) | null = null
let expectedExit = false

let engineState: EngineState = {
  status: 'stopped',
  port: null,
  modelId: null,
  error: null
}

function setEngineState(nextState: EngineState): EngineState {
  engineState = nextState
  stateEvents.emit('change', engineState)
  return engineState
}

function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production'
}

function getBinaryArch(): 'arm64' | 'x86_64' {
  return process.arch === 'arm64' ? 'arm64' : 'x86_64'
}

function resolveDevResourcesPath(): string {
  return path.resolve(__dirname, '../../resources')
}

function clearStopWaiters(): void {
  if (stopTimer) {
    clearTimeout(stopTimer)
    stopTimer = null
  }

  if (stopResolver) {
    const resolve = stopResolver
    stopResolver = null
    resolve()
  }
}

function handleProcessExit(code: number | null, signal: NodeJS.Signals | null): void {
  engineProcess = null
  currentStartPromise = null

  if (expectedExit) {
    expectedExit = false
    clearStopWaiters()
    setEngineState({
      status: 'stopped',
      port: null,
      modelId: null,
      error: null
    })
    return
  }

  if (code === 0) {
    setEngineState({
      status: 'stopped',
      port: null,
      modelId: null,
      error: null
    })
    return
  }

  const errorMessage =
    code !== null
      ? `Engine exited with code ${code}`
      : `Engine exited due to signal ${signal ?? 'unknown'}`

  setEngineState({
    status: 'error',
    port: null,
    modelId: null,
    error: errorMessage
  })
}

function attachProcessListeners(child: ChildProcess): void {
  child.once('exit', (code: number | null, signal: NodeJS.Signals | null): void => {
    handleProcessExit(code, signal)
  })

  child.once('error', (error: Error): void => {
    engineProcess = null
    currentStartPromise = null
    expectedExit = false
    clearStopWaiters()
    setEngineState({
      status: 'error',
      port: null,
      modelId: null,
      error: error.message
    })
  })
}

async function waitForHealth(port: number): Promise<void> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < HEALTH_CHECK_TIMEOUT_MS) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`)
      if (response.ok) {
        const body = (await response.json()) as { status?: string }
        if (body.status === 'ok') {
          return
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }
    }

    await new Promise<void>((resolve: () => void): void => {
      setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS)
    })
  }

  throw new Error('Timed out waiting for llama-server health check')
}

export async function findFreePort(): Promise<number> {
  return new Promise<number>(
    (resolve: (port: number) => void, reject: (error: Error) => void): void => {
      const server = net.createServer()

      server.once('error', (error: Error): void => {
        reject(error)
      })

      server.listen(0, '127.0.0.1', (): void => {
        const address = server.address()

        if (!address || typeof address === 'string') {
          server.close((): void => {
            reject(new Error('Failed to determine free port'))
          })
          return
        }

        const assignedPort = address.port
        server.close((error?: Error): void => {
          if (error) {
            reject(error)
            return
          }

          resolve(assignedPort)
        })
      })
    }
  )
}

export function getLlamaServerPath(): string {
  const resourcesPath = isProduction() ? process.resourcesPath : resolveDevResourcesPath()
  return path.join(resourcesPath, `llama-server-${getBinaryArch()}`)
}

export function getEngineState(): EngineState {
  return engineState
}

export async function startEngine(modelId: string, modelPath: string): Promise<EngineState> {
  if (engineState.status === 'running' || engineState.status === 'starting') {
    return currentStartPromise ?? Promise.resolve(engineState)
  }

  currentStartPromise = (async (): Promise<EngineState> => {
    const port = await findFreePort()

    setEngineState({
      status: 'starting',
      port,
      modelId,
      error: null
    })

    expectedExit = false
    const binaryPath = getLlamaServerPath()
    const binaryDir = path.dirname(binaryPath)
    const child = childProcess.spawn(
      binaryPath,
      ['-m', modelPath, '--host', '127.0.0.1', '--port', String(port), '-ngl', '99', '-c', '8192'],
      {
        stdio: 'ignore',
        cwd: binaryDir,
        env: { ...process.env, DYLD_LIBRARY_PATH: binaryDir }
      }
    )

    engineProcess = child
    attachProcessListeners(child)

    try {
      await waitForHealth(port)
      return setEngineState({
        status: 'running',
        port,
        modelId,
        error: null
      })
    } catch (error) {
      expectedExit = true
      child.kill('SIGTERM')
      const message = error instanceof Error ? error.message : 'Failed to start llama-server engine'
      return setEngineState({
        status: 'error',
        port: null,
        modelId: null,
        error: message
      })
    } finally {
      if (engineState.status !== 'starting') {
        currentStartPromise = null
      }
    }
  })()

  return currentStartPromise
}

export async function stopEngine(): Promise<void> {
  if (!engineProcess) {
    setEngineState({
      status: 'stopped',
      port: null,
      modelId: null,
      error: null
    })
    return
  }

  const child = engineProcess
  expectedExit = true

  await new Promise<void>((resolve: () => void): void => {
    stopResolver = resolve
    stopTimer = setTimeout((): void => {
      child.kill('SIGKILL')
    }, STOP_TIMEOUT_MS)

    child.kill('SIGTERM')
  })
}
