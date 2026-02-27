import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import Versions from './Versions'

describe('Versions Component', () => {
  beforeEach((): void => {
    Object.defineProperty(window, 'electron', {
      value: {
        process: {
          versions: {
            electron: '28.0.0',
            chrome: '120.0.0',
            node: '18.0.0'
          }
        }
      },
      writable: true,
      configurable: true
    })
  })

  it('should render Electron version', (): void => {
    render(<Versions />)
    expect(screen.getByText('Electron v28.0.0')).toBeInTheDocument()
  })

  it('should render Chrome version', (): void => {
    render(<Versions />)
    expect(screen.getByText('Chromium v120.0.0')).toBeInTheDocument()
  })

  it('should render Node version', (): void => {
    render(<Versions />)
    expect(screen.getByText('Node v18.0.0')).toBeInTheDocument()
  })

  it('should apply correct CSS class names', (): void => {
    const { container } = render(<Versions />)

    const electronLi = container.querySelector('.electron-version')
    expect(electronLi).toBeInTheDocument()
    expect(electronLi).toHaveTextContent('Electron v28.0.0')

    const chromeLi = container.querySelector('.chrome-version')
    expect(chromeLi).toBeInTheDocument()
    expect(chromeLi).toHaveTextContent('Chromium v120.0.0')

    const nodeLi = container.querySelector('.node-version')
    expect(nodeLi).toBeInTheDocument()
    expect(nodeLi).toHaveTextContent('Node v18.0.0')
  })

  it('should render versions list with correct structure', (): void => {
    const { container } = render(<Versions />)

    const ul = container.querySelector('.versions')
    expect(ul).toBeInTheDocument()
    expect(ul?.tagName).toBe('UL')

    const listItems = ul?.querySelectorAll('li')
    expect(listItems?.length).toBe(3)
  })
})
