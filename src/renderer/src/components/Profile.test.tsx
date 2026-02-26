import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Profile } from './Profile'

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('Profile Component', () => {
  beforeEach(() => {
    // Reset the mock before each test
    window.electron = {
      ipcRenderer: {
        invoke: vi.fn().mockImplementation(async (channel) => {
          if (channel === 'profile:load') {
            return {
              personalInfo: {
                name: 'Test Name',
                email: 'test@example.com',
                phone: '1234567890',
                summary: 'A test summary'
              },
              workExperience: [],
              projects: []
            }
          }
          if (channel === 'profile:save') {
            return { success: true }
          }
          return undefined
        }),
        send: vi.fn(),
        on: vi.fn(),
        once: vi.fn(),
        removeAllListeners: vi.fn()
      }
    } as unknown as Window['electron']
  })

  it('renders correctly and loads data', async () => {
    render(<Profile />)

    // Initially loading
    expect(screen.getByText('Loading profile...')).toBeInTheDocument()

    // Wait for load
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    // Check if data is populated
    expect(screen.getByDisplayValue('Test Name')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A test summary')).toBeInTheDocument()
  })

  it('can update personal info and save', async () => {
    render(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    const nameInput = screen.getByDisplayValue('Test Name')
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } })

    expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument()

    const saveButton = screen.getByText('profile.save_changes')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(window.electron.ipcRenderer.invoke).toHaveBeenCalledWith(
        'profile:save',
        expect.objectContaining({
          personalInfo: expect.objectContaining({
            name: 'Updated Name'
          })
        })
      )
    })
  })

  it('can add and remove work experience', async () => {
    render(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    const addExperienceBtn = screen.getByText('Add Experience')
    fireEvent.click(addExperienceBtn)

    // Wait for new fields to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Company Name')).toBeInTheDocument()
    })

    // Type something in company
    const companyInput = screen.getByPlaceholderText('Company Name')
    fireEvent.change(companyInput, { target: { value: 'New Company' } })
    expect(screen.getByDisplayValue('New Company')).toBeInTheDocument()

    // Remove it
    const removeBtn = screen.getByText('Remove')
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(screen.queryByDisplayValue('New Company')).not.toBeInTheDocument()
    })
  })

  it('can add and remove projects', async () => {
    render(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    const addProjectBtn = screen.getByText('Add Project')
    fireEvent.click(addProjectBtn)

    // Wait for new fields to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Project Name')).toBeInTheDocument()
    })

    // Type something in project
    const projectInput = screen.getByPlaceholderText('Project Name')
    fireEvent.change(projectInput, { target: { value: 'New Project' } })
    expect(screen.getByDisplayValue('New Project')).toBeInTheDocument()

    const removeBtn = screen.getByText('Remove')
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(screen.queryByDisplayValue('New Project')).not.toBeInTheDocument()
    })
  })
})
