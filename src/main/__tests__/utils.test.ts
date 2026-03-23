import { describe, it, expect } from 'vitest'
import { toErrorMessage } from '../utils'

describe('toErrorMessage', (): void => {
  it('returns message from Error instance', (): void => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('returns message from Error subclass', (): void => {
    expect(toErrorMessage(new TypeError('type fail'))).toBe('type fail')
  })

  it('converts string to string', (): void => {
    expect(toErrorMessage('string error')).toBe('string error')
  })

  it('converts number to string', (): void => {
    expect(toErrorMessage(42)).toBe('42')
  })

  it('converts null to string', (): void => {
    expect(toErrorMessage(null)).toBe('null')
  })

  it('converts undefined to string', (): void => {
    expect(toErrorMessage(undefined)).toBe('undefined')
  })

  it('converts object to string', (): void => {
    expect(toErrorMessage({ code: 'ERR' })).toBe('[object Object]')
  })
})
