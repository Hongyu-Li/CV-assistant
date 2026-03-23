import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InterviewTimeline } from './InterviewTimeline'
import type { InterviewRound } from './types'

vi.mock('../../lib/markdown', () => ({
  markdownToHtml: vi.fn((md: string): string => `<p>${md}</p>`)
}))

vi.mock('../MarkdownEditor', async () => {
  const React = await import('react')
  return {
    MarkdownEditor: ({
      value,
      onChange
    }: {
      value: string
      onChange: (v: string) => void
      minHeight?: string
    }): React.ReactElement =>
      React.createElement('textarea', {
        'data-testid': 'markdown-editor',
        value,
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>): void => onChange(e.target.value)
      })
  }
})

vi.mock('../ui/dialog', async () => {
  const React = await import('react')
  return {
    Dialog: ({
      open,
      children
    }: {
      open: boolean
      onOpenChange?: (open: boolean) => void
      children: React.ReactNode
    }): React.ReactElement | null => {
      if (!open) return null
      return React.createElement('div', { 'data-testid': 'dialog', role: 'dialog' }, children)
    },
    DialogContent: ({
      children
    }: {
      children: React.ReactNode
      className?: string
    }): React.ReactElement =>
      React.createElement('div', { 'data-testid': 'dialog-content' }, children),
    DialogHeader: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement('div', { 'data-testid': 'dialog-header' }, children),
    DialogFooter: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement('div', { 'data-testid': 'dialog-footer' }, children),
    DialogTitle: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement('h2', { 'data-testid': 'dialog-title' }, children),
    DialogDescription: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement('p', { 'data-testid': 'dialog-description' }, children)
  }
})

vi.mock('../ui/input', async () => {
  const React = await import('react')
  return {
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>): React.ReactElement =>
      React.createElement('input', { 'data-testid': 'input', ...props })
  }
})

vi.mock('../ui/button', async () => {
  const React = await import('react')
  return {
    Button: ({
      children,
      onClick,
      className,
      type
    }: {
      children: React.ReactNode
      onClick?: () => void
      className?: string
      type?: 'button' | 'submit' | 'reset'
    }): React.ReactElement =>
      React.createElement('button', { onClick, className, type: type ?? 'button' }, children)
  }
})

vi.mock('../ui/select', async () => {
  const React = await import('react')
  return {
    Select: ({
      value,
      onValueChange,
      children
    }: {
      value: string
      onValueChange: (v: string) => void
      children: React.ReactNode
    }): React.ReactElement =>
      React.createElement(
        'div',
        { 'data-testid': 'select-root' },
        React.createElement(
          'select',
          {
            value,
            'data-current-value': value,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>): void =>
              onValueChange(e.target.value),
            'data-testid': 'native-select'
          },
          children
        )
      ),
    SelectTrigger: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement(React.Fragment, null, children),
    SelectContent: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement(React.Fragment, null, children),
    SelectItem: ({
      value,
      children
    }: {
      value: string
      children: React.ReactNode
    }): React.ReactElement => React.createElement('option', { value }, children),
    SelectValue: (): React.ReactElement => React.createElement(React.Fragment, null)
  }
})

vi.stubGlobal('crypto', { randomUUID: vi.fn((): string => 'test-uuid-1') })

function makeRound(overrides: Partial<InterviewRound> = {}): InterviewRound {
  return {
    id: 'round-1',
    round: 'first',
    date: '2024-01-15',
    notes: '',
    result: 'pending',
    ...overrides
  }
}

async function renderExpanded(
  rounds: InterviewRound[] = [],
  onRoundsChange = vi.fn(),
  onStatusChange = vi.fn()
): Promise<void> {
  render(
    <InterviewTimeline
      interviewRounds={rounds}
      onInterviewRoundsChange={onRoundsChange}
      onInterviewStatusChange={onStatusChange}
    />
  )
  await act(async (): Promise<void> => {
    fireEvent.click(screen.getByText('resumes.interview_rounds'))
  })
}

describe('InterviewTimeline — rendering', () => {
  beforeEach((): void => {
    vi.clearAllMocks()
  })

  it('renders collapsed by default — no "no_rounds" message visible', (): void => {
    render(
      <InterviewTimeline
        interviewRounds={[]}
        onInterviewRoundsChange={vi.fn()}
        onInterviewStatusChange={vi.fn()}
      />
    )
    expect(screen.queryByText('resumes.no_rounds')).not.toBeInTheDocument()
  })

  it('shows "resumes.interview_rounds" header label', (): void => {
    render(
      <InterviewTimeline
        interviewRounds={[]}
        onInterviewRoundsChange={vi.fn()}
        onInterviewStatusChange={vi.fn()}
      />
    )
    expect(screen.getByText('resumes.interview_rounds')).toBeInTheDocument()
  })

  it('expands when header button is clicked', async (): Promise<void> => {
    await renderExpanded([])
    expect(screen.getByText('resumes.no_rounds')).toBeInTheDocument()
  })

  it('shows empty state message when expanded and no rounds', async (): Promise<void> => {
    await renderExpanded([])
    expect(screen.getByText('resumes.no_rounds')).toBeInTheDocument()
  })

  it('shows "resumes.add_round" button when expanded', async (): Promise<void> => {
    await renderExpanded([])
    expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
  })

  it('renders timeline rounds when expanded and rounds exist', async (): Promise<void> => {
    const round = makeRound({ round: 'first', result: 'pending' })
    await renderExpanded([round])
    expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
  })
})

describe('InterviewTimeline — round display', () => {
  beforeEach((): void => {
    vi.clearAllMocks()
  })

  it('shows round name, date, and result badge for each round', async (): Promise<void> => {
    const round = makeRound({ round: 'second', result: 'passed', date: '2024-03-10' })
    await renderExpanded([round])
    expect(screen.getByText('resumes.round_second')).toBeInTheDocument()
    expect(screen.getByText('resumes.result_passed')).toBeInTheDocument()
  })

  it('sorts rounds by date ascending', async (): Promise<void> => {
    const round1 = makeRound({ id: 'r1', round: 'second', date: '2024-03-10', result: 'passed' })
    const round2 = makeRound({ id: 'r2', round: 'first', date: '2024-01-05', result: 'pending' })
    await renderExpanded([round1, round2])

    const roundNames = screen.getAllByText(/resumes\.round_/)
    const texts = roundNames.map((el) => el.textContent)
    expect(texts.indexOf('resumes.round_first')).toBeLessThan(texts.indexOf('resumes.round_second'))
  })

  it('applies green dot class for passed result', async (): Promise<void> => {
    const round = makeRound({ result: 'passed' })
    const { container } = render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={vi.fn()}
        onInterviewStatusChange={vi.fn()}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(container.querySelector('button[type="button"]')!)
    })
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument()
  })

  it('applies red dot class for failed result', async (): Promise<void> => {
    const round = makeRound({ result: 'failed' })
    const { container } = render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={vi.fn()}
        onInterviewStatusChange={vi.fn()}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(container.querySelector('button[type="button"]')!)
    })
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument()
  })

  it('applies yellow dot class for pending result', async (): Promise<void> => {
    const round = makeRound({ result: 'pending' })
    const { container } = render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={vi.fn()}
        onInterviewStatusChange={vi.fn()}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(container.querySelector('button[type="button"]')!)
    })
    expect(container.querySelector('.bg-yellow-400')).toBeInTheDocument()
  })

  it('renders notes via markdownToHtml when notes are non-empty', async (): Promise<void> => {
    const { markdownToHtml } = await import('../../lib/markdown')
    const round = makeRound({ notes: 'Great interview' })
    await renderExpanded([round])
    expect(markdownToHtml).toHaveBeenCalledWith('Great interview')
    expect(screen.getByText('resumes.interview_notes')).toBeInTheDocument()
  })

  it('does not render notes section when notes is empty string', async (): Promise<void> => {
    const round = makeRound({ notes: '' })
    await renderExpanded([round])
    expect(screen.queryByText('resumes.interview_notes')).not.toBeInTheDocument()
  })
})

describe('InterviewTimeline — add round', () => {
  beforeEach((): void => {
    vi.clearAllMocks()
  })

  it('clicking "resumes.add_round" opens the edit dialog', async (): Promise<void> => {
    await renderExpanded([])
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.add_round'))
    })
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
    expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
  })

  it('new round gets default values: round=first, result=pending', async (): Promise<void> => {
    await renderExpanded([])
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.add_round'))
    })
    expect(
      document.querySelector('select[data-current-value="first"]') as HTMLSelectElement
    ).not.toBeNull()
    expect(
      document.querySelector('select[data-current-value="pending"]') as HTMLSelectElement
    ).not.toBeNull()
  })

  it('uses crypto.randomUUID for new round id', async (): Promise<void> => {
    await renderExpanded([])
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.add_round'))
    })
    expect(crypto.randomUUID).toHaveBeenCalled()
  })
})

describe('InterviewTimeline — edit round', () => {
  beforeEach((): void => {
    vi.clearAllMocks()
  })

  it('clicking edit button opens dialog with round data pre-filled', async (): Promise<void> => {
    const round = makeRound({ round: 'second', result: 'passed', date: '2024-05-20' })
    await renderExpanded([round])

    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[0])
    })

    expect(screen.getByTestId('dialog')).toBeInTheDocument()
    expect(
      document.querySelector('select[data-current-value="second"]') as HTMLSelectElement
    ).not.toBeNull()
  })

  it('saving calls onInterviewRoundsChange with updated round', async (): Promise<void> => {
    const onRoundsChange = vi.fn()
    const onStatusChange = vi.fn()
    const round = makeRound({ id: 'r1', round: 'first', result: 'pending' })

    render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={onRoundsChange}
        onInterviewStatusChange={onStatusChange}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.interview_rounds'))
    })

    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[0])
    })

    const resultSelect = document.querySelector(
      'select[data-current-value="pending"]'
    ) as HTMLSelectElement
    await act(async (): Promise<void> => {
      fireEvent.change(resultSelect, { target: { value: 'passed' } })
    })

    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('common.save'))
    })

    expect(onRoundsChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'r1', result: 'passed' })])
    )
  })

  it('saving calls onInterviewStatusChange with derived status', async (): Promise<void> => {
    const onRoundsChange = vi.fn()
    const onStatusChange = vi.fn()
    const round = makeRound({ id: 'r1', round: 'second', result: 'pending' })

    render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={onRoundsChange}
        onInterviewStatusChange={onStatusChange}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.interview_rounds'))
    })

    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[0])
    })

    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('common.save'))
    })

    expect(onStatusChange).toHaveBeenCalledWith('second_interview')
  })

  it('cancel closes dialog without calling callbacks', async (): Promise<void> => {
    const onRoundsChange = vi.fn()
    const onStatusChange = vi.fn()
    const round = makeRound()

    render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={onRoundsChange}
        onInterviewStatusChange={onStatusChange}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.interview_rounds'))
    })

    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[0])
    })

    expect(screen.getByTestId('dialog')).toBeInTheDocument()

    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('common.cancel'))
    })

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    expect(onRoundsChange).not.toHaveBeenCalled()
    expect(onStatusChange).not.toHaveBeenCalled()
  })
})

describe('InterviewTimeline — delete round', () => {
  beforeEach((): void => {
    vi.clearAllMocks()
  })

  it('clicking delete calls onInterviewRoundsChange with round removed', async (): Promise<void> => {
    const onRoundsChange = vi.fn()
    const onStatusChange = vi.fn()
    const round = makeRound({ id: 'del-1' })

    render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={onRoundsChange}
        onInterviewStatusChange={onStatusChange}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.interview_rounds'))
    })

    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[1])
    })

    expect(onRoundsChange).toHaveBeenCalledWith([])
  })

  it('clicking delete calls onInterviewStatusChange with recalculated status', async (): Promise<void> => {
    const onRoundsChange = vi.fn()
    const onStatusChange = vi.fn()
    const round = makeRound({ id: 'del-1' })

    render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={onRoundsChange}
        onInterviewStatusChange={onStatusChange}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.interview_rounds'))
    })

    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[1])
    })

    expect(onStatusChange).toHaveBeenCalledWith('draft')
  })

  it('deleting one of two rounds keeps the other and recalculates status', async (): Promise<void> => {
    const onRoundsChange = vi.fn()
    const onStatusChange = vi.fn()
    const round1 = makeRound({ id: 'r1', round: 'first', result: 'passed', date: '2024-01-01' })
    const round2 = makeRound({ id: 'r2', round: 'second', result: 'pending', date: '2024-02-01' })

    render(
      <InterviewTimeline
        interviewRounds={[round1, round2]}
        onInterviewRoundsChange={onRoundsChange}
        onInterviewStatusChange={onStatusChange}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.interview_rounds'))
    })

    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[1])
    })

    expect(onRoundsChange).toHaveBeenCalledWith([round2])
    expect(onStatusChange).toHaveBeenCalledWith('second_interview')
  })
})

describe('InterviewTimeline — deriveInterviewStatus (via callbacks)', () => {
  beforeEach((): void => {
    vi.clearAllMocks()
  })

  it('empty rounds → status is "draft"', async (): Promise<void> => {
    const onRoundsChange = vi.fn()
    const onStatusChange = vi.fn()
    const round = makeRound({ id: 'r1' })

    render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={onRoundsChange}
        onInterviewStatusChange={onStatusChange}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.interview_rounds'))
    })
    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[1])
    })
    expect(onStatusChange).toHaveBeenCalledWith('draft')
  })

  it('latest round with result "failed" → "interview_failed"', async (): Promise<void> => {
    const onRoundsChange = vi.fn()
    const onStatusChange = vi.fn()
    const round = makeRound({ id: 'r1', round: 'first', result: 'pending' })

    render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={onRoundsChange}
        onInterviewStatusChange={onStatusChange}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.interview_rounds'))
    })
    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[0])
    })
    const resultSelect = document.querySelector(
      'select[data-current-value="pending"]'
    ) as HTMLSelectElement
    await act(async (): Promise<void> => {
      fireEvent.change(resultSelect, { target: { value: 'failed' } })
    })
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('common.save'))
    })
    expect(onStatusChange).toHaveBeenCalledWith('interview_failed')
  })

  it('round type "hr" with result "passed" → "hr_interview"', async (): Promise<void> => {
    const onRoundsChange = vi.fn()
    const onStatusChange = vi.fn()
    const round = makeRound({ id: 'r1', round: 'first', result: 'pending' })

    render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={onRoundsChange}
        onInterviewStatusChange={onStatusChange}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.interview_rounds'))
    })
    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[0])
    })
    const roundSelect = document.querySelector(
      'select[data-current-value="first"]'
    ) as HTMLSelectElement
    await act(async (): Promise<void> => {
      fireEvent.change(roundSelect, { target: { value: 'hr' } })
    })
    const resultSelect = document.querySelector(
      'select[data-current-value="pending"]'
    ) as HTMLSelectElement
    await act(async (): Promise<void> => {
      fireEvent.change(resultSelect, { target: { value: 'passed' } })
    })
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('common.save'))
    })
    expect(onStatusChange).toHaveBeenCalledWith('hr_interview')
  })

  it('multiple rounds sorted by date — latest determines status', async (): Promise<void> => {
    const onRoundsChange = vi.fn()
    const onStatusChange = vi.fn()
    const r1 = makeRound({ id: 'r1', round: 'first', result: 'passed', date: '2024-01-01' })
    const r2 = makeRound({ id: 'r2', round: 'third', result: 'pending', date: '2024-06-01' })

    render(
      <InterviewTimeline
        interviewRounds={[r1, r2]}
        onInterviewRoundsChange={onRoundsChange}
        onInterviewStatusChange={onStatusChange}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.interview_rounds'))
    })
    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[2])
    })
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('common.save'))
    })
    expect(onStatusChange).toHaveBeenCalledWith('third_interview')
  })

  it('round type "fifth" with result "passed" → "fifth_interview"', async (): Promise<void> => {
    const onRoundsChange = vi.fn()
    const onStatusChange = vi.fn()
    const round = makeRound({ id: 'r1', round: 'first', result: 'pending' })

    render(
      <InterviewTimeline
        interviewRounds={[round]}
        onInterviewRoundsChange={onRoundsChange}
        onInterviewStatusChange={onStatusChange}
      />
    )
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('resumes.interview_rounds'))
    })
    const emptyBtns = screen.getAllByRole('button').filter((btn) => btn.textContent === '')
    await act(async (): Promise<void> => {
      fireEvent.click(emptyBtns[0])
    })
    const roundSelect = document.querySelector(
      'select[data-current-value="first"]'
    ) as HTMLSelectElement
    await act(async (): Promise<void> => {
      fireEvent.change(roundSelect, { target: { value: 'fifth' } })
    })
    const resultSelect = document.querySelector(
      'select[data-current-value="pending"]'
    ) as HTMLSelectElement
    await act(async (): Promise<void> => {
      fireEvent.change(resultSelect, { target: { value: 'passed' } })
    })
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByText('common.save'))
    })
    expect(onStatusChange).toHaveBeenCalledWith('fifth_interview')
  })
})
