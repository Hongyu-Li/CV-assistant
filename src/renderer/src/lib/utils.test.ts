import { describe, it, expect } from 'vitest'
import { toErrorMessage } from './utils'

describe('toErrorMessage', () => {
  it('extracts message from Error instance', () => {
    expect(toErrorMessage(new Error('something broke'))).toBe('something broke')
  })

  it('extracts message from Error subclass', () => {
    expect(toErrorMessage(new TypeError('bad type'))).toBe('bad type')
  })

  it('converts string to itself', () => {
    expect(toErrorMessage('plain string')).toBe('plain string')
  })

  it('converts number to string', () => {
    expect(toErrorMessage(42)).toBe('42')
  })

  it('converts null to string', () => {
    expect(toErrorMessage(null)).toBe('null')
  })

  it('converts undefined to string', () => {
    expect(toErrorMessage(undefined)).toBe('undefined')
  })

  it('converts object to string', () => {
    expect(toErrorMessage({ key: 'value' })).toBe('[object Object]')
  })
})
