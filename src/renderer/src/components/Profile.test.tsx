import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Profile } from './Profile'
import { SettingsProvider } from '../context/SettingsContext'
import { toast } from 'sonner'

// Mock MarkdownEditor since Tiptap does not render text in jsdom
vi.mock('./MarkdownEditor', () => ({
  MarkdownEditor: ({
    value,
    onChange
  }: {
    value: string
    onChange: (v: string) => void
  }): React.ReactElement => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e): void => onChange(e.target.value)}
    />
  )
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

const renderWithProvider = (ui: React.ReactElement): ReturnType<typeof render> => {
  return render(<SettingsProvider>{ui}</SettingsProvider>)
}

describe('Profile Component', () => {
  beforeEach((): void => {
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      async (channel: string) => {
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
        if (channel === 'settings:load') {
          return { workspacePath: '' }
        }
        return undefined
      }
    )
  })
  it('renders correctly and loads data', async () => {
    const { container } = renderWithProvider(<Profile />)

    // Initially loading — skeleton with shimmer
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument()

    // Wait for load
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    // Check if data is populated
    expect(screen.getByDisplayValue('Test Name')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument()
    // Summary is rendered inside mocked MarkdownEditor (textarea)
    expect(screen.getByDisplayValue('A test summary')).toBeInTheDocument()
  })

  it('can update personal info and save', async () => {
    renderWithProvider(<Profile />)
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
        }),
        expect.anything() // workspacePath
      )
    })
  })

  it('can add and remove work experience', async () => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    const addExperienceBtn = screen.getByText('profile.add_experience')
    fireEvent.click(addExperienceBtn)

    // Wait for new fields to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('profile.company_ph')).toBeInTheDocument()
    })

    // Type something in company
    const companyInput = screen.getByPlaceholderText('profile.company_ph')
    fireEvent.change(companyInput, { target: { value: 'New Company' } })
    expect(screen.getByDisplayValue('New Company')).toBeInTheDocument()

    // Remove it
    const removeBtn = screen.getByText('profile.remove')
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(screen.queryByDisplayValue('New Company')).not.toBeInTheDocument()
    })
  })

  it('can add and remove projects', async () => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    const addProjectBtn = screen.getByText('profile.add_project')
    fireEvent.click(addProjectBtn)

    // Wait for new fields to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('profile.project_name_ph')).toBeInTheDocument()
    })

    // Type something in project
    const projectInput = screen.getByPlaceholderText('profile.project_name_ph')
    fireEvent.change(projectInput, { target: { value: 'New Project' } })
    expect(screen.getByDisplayValue('New Project')).toBeInTheDocument()

    const removeBtn = screen.getByText('profile.remove')
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(screen.queryByDisplayValue('New Project')).not.toBeInTheDocument()
    })
  })
})

describe('Profile - Save Error Paths', () => {
  beforeEach((): void => {
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      async (channel: string) => {
        if (channel === 'profile:load') {
          return {
            personalInfo: { name: '', email: '', phone: '', summary: '' },
            workExperience: [],
            projects: []
          }
        }
        if (channel === 'profile:save') {
          return { success: true }
        }
        if (channel === 'settings:load') {
          return { workspacePath: '' }
        }
        return undefined
      }
    )
  })
  it('shows error toast when save returns success: false', async (): Promise<void> => {
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      async (channel: string) => {
        if (channel === 'profile:load') {
          return {
            personalInfo: { name: '', email: '', phone: '', summary: '' },
            workExperience: [],
            projects: []
          }
        }
        if (channel === 'profile:save') {
          return { success: false, error: 'disk full' }
        }
        if (channel === 'settings:load') {
          return { workspacePath: '' }
        }
        return undefined
      }
    )

    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('profile.save_changes'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('profile.save_error'))
    })
  })

  it('shows error toast when save throws an exception', async (): Promise<void> => {
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      async (channel: string) => {
        if (channel === 'profile:load') {
          return {
            personalInfo: { name: '', email: '', phone: '', summary: '' },
            workExperience: [],
            projects: []
          }
        }
        if (channel === 'profile:save') {
          throw new Error('network error')
        }
        if (channel === 'settings:load') {
          return { workspacePath: '' }
        }
        return undefined
      }
    )

    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('profile.save_changes'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('profile.save_error')
    })
  })
})

describe('Profile - Load Error Paths', () => {
  it('shows error toast when load throws an exception', async (): Promise<void> => {
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      async (channel) => {
        if (channel === 'profile:load') {
          throw new Error('load failed')
        }
        if (channel === 'settings:load') {
          return { workspacePath: '' }
        }
        return undefined
      }
    )

    renderWithProvider(<Profile />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('profile.load_error')
    })
  })

  it('keeps initial empty state when load returns empty data', async (): Promise<void> => {
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      async (channel) => {
        if (channel === 'profile:load') {
          return {}
        }
        if (channel === 'settings:load') {
          return { workspacePath: '' }
        }
        return undefined
      }
    )

    renderWithProvider(<Profile />)

    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    // Profile fields should be empty (initial state)
    const nameInput = screen.getByPlaceholderText('profile.name_ph') as HTMLInputElement
    expect(nameInput.value).toBe('')
    const emailInput = screen.getByPlaceholderText('profile.email_ph') as HTMLInputElement
    expect(emailInput.value).toBe('')
  })

  it('keeps initial empty state when load returns null', async (): Promise<void> => {
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      async (channel) => {
        if (channel === 'profile:load') {
          return null
        }
        if (channel === 'settings:load') {
          return { workspacePath: '' }
        }
        return undefined
      }
    )

    renderWithProvider(<Profile />)

    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText('profile.name_ph') as HTMLInputElement
    expect(nameInput.value).toBe('')
  })
})

describe('Profile - Work Experience CRUD', () => {
  beforeEach((): void => {
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      async (channel: string) => {
        if (channel === 'profile:load') {
          return {
            personalInfo: { name: '', email: '', phone: '', summary: '' },
            workExperience: [],
            projects: []
          }
        }
        if (channel === 'profile:save') {
          return { success: true }
        }
        if (channel === 'settings:load') {
          return { workspacePath: '' }
        }
        return undefined
      }
    )
  })
  it('can add two work experiences and verify both render', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    const addBtn = screen.getByText('profile.add_experience')
    fireEvent.click(addBtn)
    fireEvent.click(addBtn)

    await waitFor(() => {
      const companyInputs = screen.getAllByPlaceholderText('profile.company_ph')
      expect(companyInputs).toHaveLength(2)
    })

    // Both should have role and date inputs too
    expect(screen.getAllByPlaceholderText('profile.role_ph')).toHaveLength(2)
    expect(screen.getAllByPlaceholderText('profile.date_range_ph')).toHaveLength(2)
  })

  it('removes specific work experience (not the first one)', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    // Add two experiences
    const addBtn = screen.getByText('profile.add_experience')
    fireEvent.click(addBtn)
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('profile.company_ph')).toHaveLength(2)
    })

    // Type into each to differentiate them
    const companyInputs = screen.getAllByPlaceholderText('profile.company_ph')
    fireEvent.change(companyInputs[0], { target: { value: 'Company A' } })
    fireEvent.change(companyInputs[1], { target: { value: 'Company B' } })

    // Remove the second one
    const removeBtns = screen.getAllByText('profile.remove')
    fireEvent.click(removeBtns[1])

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('profile.company_ph')).toHaveLength(1)
    })

    // Company A should remain, Company B should be gone
    expect(screen.getByDisplayValue('Company A')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Company B')).not.toBeInTheDocument()
  })

  it('updates work experience role field', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('profile.add_experience'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('profile.role_ph')).toBeInTheDocument()
    })

    const roleInput = screen.getByPlaceholderText('profile.role_ph')
    fireEvent.change(roleInput, { target: { value: 'Senior Engineer' } })

    expect(screen.getByDisplayValue('Senior Engineer')).toBeInTheDocument()
  })

  it('updates work experience date field', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('profile.add_experience'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('profile.date_range_ph')).toBeInTheDocument()
    })

    const dateInput = screen.getByPlaceholderText('profile.date_range_ph')
    fireEvent.change(dateInput, { target: { value: '2020 - 2024' } })

    expect(screen.getByDisplayValue('2020 - 2024')).toBeInTheDocument()
  })

  it('updates work experience description via MarkdownEditor', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('profile.add_experience'))

    await waitFor(() => {
      expect(screen.getAllByTestId('markdown-editor').length).toBeGreaterThanOrEqual(2)
    })

    // The summary editor is index 0, work experience description is index 1
    const editors = screen.getAllByTestId('markdown-editor')
    const workDescEditor = editors[1]
    fireEvent.change(workDescEditor, { target: { value: 'Built microservices' } })

    expect(workDescEditor).toHaveValue('Built microservices')
  })
})

describe('Profile - Project CRUD', () => {
  beforeEach((): void => {
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      async (channel: string) => {
        if (channel === 'profile:load') {
          return {
            personalInfo: { name: '', email: '', phone: '', summary: '' },
            workExperience: [],
            projects: []
          }
        }
        if (channel === 'profile:save') {
          return { success: true }
        }
        if (channel === 'settings:load') {
          return { workspacePath: '' }
        }
        return undefined
      }
    )
  })
  it('can add two projects and verify both render', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    const addBtn = screen.getByText('profile.add_project')
    fireEvent.click(addBtn)
    fireEvent.click(addBtn)

    await waitFor(() => {
      const nameInputs = screen.getAllByPlaceholderText('profile.project_name_ph')
      expect(nameInputs).toHaveLength(2)
    })

    expect(screen.getAllByPlaceholderText('profile.tech_stack_ph')).toHaveLength(2)
  })

  it('removes specific project (not the first one)', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    const addBtn = screen.getByText('profile.add_project')
    fireEvent.click(addBtn)
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('profile.project_name_ph')).toHaveLength(2)
    })

    const nameInputs = screen.getAllByPlaceholderText('profile.project_name_ph')
    fireEvent.change(nameInputs[0], { target: { value: 'Project Alpha' } })
    fireEvent.change(nameInputs[1], { target: { value: 'Project Beta' } })

    // Remove the second project
    const removeBtns = screen.getAllByText('profile.remove')
    fireEvent.click(removeBtns[1])

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('profile.project_name_ph')).toHaveLength(1)
    })

    expect(screen.getByDisplayValue('Project Alpha')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Project Beta')).not.toBeInTheDocument()
  })

  it('updates project techStack field', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('profile.add_project'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('profile.tech_stack_ph')).toBeInTheDocument()
    })

    const techInput = screen.getByPlaceholderText('profile.tech_stack_ph')
    fireEvent.change(techInput, { target: { value: 'React, TypeScript, Node.js' } })

    expect(screen.getByDisplayValue('React, TypeScript, Node.js')).toBeInTheDocument()
  })

  it('updates project description via MarkdownEditor', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('profile.add_project'))

    await waitFor(() => {
      expect(screen.getAllByTestId('markdown-editor').length).toBeGreaterThanOrEqual(2)
    })

    // Summary editor is index 0, project description is index 1
    const editors = screen.getAllByTestId('markdown-editor')
    const projDescEditor = editors[1]
    fireEvent.change(projDescEditor, { target: { value: 'A full-stack web app' } })

    expect(projDescEditor).toHaveValue('A full-stack web app')
  })
})

describe('Profile - Edge Cases', () => {
  beforeEach((): void => {
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      async (channel: string) => {
        if (channel === 'profile:load') {
          return {
            personalInfo: { name: '', email: '', phone: '', summary: '' },
            workExperience: [],
            projects: []
          }
        }
        if (channel === 'profile:save') {
          return { success: true }
        }
        if (channel === 'settings:load') {
          return { workspacePath: '' }
        }
        return undefined
      }
    )
  })
  it('shows empty state message when no work experiences exist', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    expect(screen.getByText('profile.no_work_experience')).toBeInTheDocument()
  })

  it('shows empty state message when no projects exist', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    expect(screen.getByText('profile.no_projects')).toBeInTheDocument()
  })

  it('save with empty required fields still calls IPC', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    // All fields are empty by default from our mock
    fireEvent.click(screen.getByText('profile.save_changes'))

    await waitFor(() => {
      expect(window.electron.ipcRenderer.invoke).toHaveBeenCalledWith(
        'profile:save',
        expect.objectContaining({
          personalInfo: expect.objectContaining({
            name: '',
            email: '',
            phone: ''
          })
        }),
        expect.anything()
      )
    })

    expect(toast.success).toHaveBeenCalledWith('profile.save_success')
  })

  it('hides empty state message after adding work experience', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    expect(screen.getByText('profile.no_work_experience')).toBeInTheDocument()

    fireEvent.click(screen.getByText('profile.add_experience'))

    await waitFor(() => {
      expect(screen.queryByText('profile.no_work_experience')).not.toBeInTheDocument()
    })
  })

  it('hides empty state message after adding project', async (): Promise<void> => {
    renderWithProvider(<Profile />)
    await waitFor(() => {
      expect(screen.getByText('profile.title')).toBeInTheDocument()
    })

    expect(screen.getByText('profile.no_projects')).toBeInTheDocument()

    fireEvent.click(screen.getByText('profile.add_project'))

    await waitFor(() => {
      expect(screen.queryByText('profile.no_projects')).not.toBeInTheDocument()
    })
  })
})
