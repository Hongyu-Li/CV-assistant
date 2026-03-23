import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Plus, Trash2, Edit2 } from 'lucide-react'
import { markdownToHtml } from '../../lib/markdown'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select'
import { MarkdownEditor } from '../MarkdownEditor'
import type { InterviewRound, InterviewStatus } from './types'
import { ConfirmDialog } from '../ConfirmDialog'

const ROUND_TO_STATUS: Record<string, InterviewStatus> = {
  first: 'first_interview',
  second: 'second_interview',
  third: 'third_interview',
  fourth: 'fourth_interview',
  fifth: 'fifth_interview',
  hr: 'hr_interview'
}

function deriveInterviewStatus(rounds: InterviewRound[]): InterviewStatus {
  if (rounds.length === 0) return 'draft'
  const sortedRounds = [...rounds].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const latestRound = sortedRounds[sortedRounds.length - 1]
  if (latestRound.result === 'failed') return 'interview_failed'
  return ROUND_TO_STATUS[latestRound.round] || 'draft'
}

interface InterviewTimelineProps {
  interviewRounds: InterviewRound[]
  onInterviewRoundsChange: (rounds: InterviewRound[]) => void
  onInterviewStatusChange: (status: InterviewStatus) => void
}

export function InterviewTimeline({
  interviewRounds,
  onInterviewRoundsChange,
  onInterviewStatusChange
}: InterviewTimelineProps): React.JSX.Element {
  const { t } = useTranslation()
  const [roundsExpanded, setRoundsExpanded] = useState(false)
  const [editingRound, setEditingRound] = useState<InterviewRound | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [roundToDelete, setRoundToDelete] = useState<string | null>(null)

  const handleDeleteClick = (roundId: string): void => {
    setRoundToDelete(roundId)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = (): void => {
    if (!roundToDelete) return
    const updatedRounds = interviewRounds.filter((r) => r.id !== roundToDelete)
    onInterviewRoundsChange(updatedRounds)
    onInterviewStatusChange(deriveInterviewStatus(updatedRounds))
    setConfirmDeleteOpen(false)
    setRoundToDelete(null)
  }

  const handleSaveRound = (): void => {
    if (editingRound) {
      const updatedRounds = ((): InterviewRound[] => {
        const existing = interviewRounds.find((r) => r.id === editingRound.id)
        if (existing) {
          return interviewRounds.map((r) => (r.id === editingRound.id ? editingRound : r))
        }
        return [...interviewRounds, editingRound]
      })()
      onInterviewRoundsChange(updatedRounds)
      onInterviewStatusChange(deriveInterviewStatus(updatedRounds))
      setEditingRound(null)
    }
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setRoundsExpanded(!roundsExpanded)}
          className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
        >
          <span className="font-medium">{t('resumes.interview_rounds')}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${roundsExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        {roundsExpanded && (
          <div className="p-4 space-y-4">
            {interviewRounds.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('resumes.no_rounds')}
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-muted" />

                <div className="space-y-0">
                  {[...interviewRounds]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((round, index) => {
                      const dotColor =
                        round.result === 'passed'
                          ? 'bg-green-500 border-green-500'
                          : round.result === 'failed'
                            ? 'bg-red-500 border-red-500'
                            : 'bg-yellow-400 border-yellow-400'

                      return (
                        <div key={round.id} className="relative flex gap-4 pb-6">
                          <div className="relative z-10">
                            <div
                              className={`w-10 h-10 rounded-full border-4 border-background ${dotColor} flex items-center justify-center shadow-sm`}
                            >
                              <span className="text-xs font-bold text-white">{index + 1}</span>
                            </div>
                          </div>

                          <div className="flex-1 -mt-1">
                            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-sm">
                                    {t(`resumes.round_${round.round}`)}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(round.date).toLocaleDateString()} ·{' '}
                                    {new Date(round.date).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      round.result === 'passed'
                                        ? 'bg-green-100 text-green-700'
                                        : round.result === 'failed'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {t(`resumes.result_${round.result}`)}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setEditingRound(round)}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleDeleteClick(round.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {round.notes && (
                                <div className="space-y-2 text-sm">
                                  <div className="bg-muted/50 rounded p-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      {t('resumes.interview_notes')}
                                    </p>
                                    <div
                                      className="text-sm prose prose-sm dark:prose-invert max-w-none max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
                                      dangerouslySetInnerHTML={{
                                        __html: markdownToHtml(round.notes)
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() =>
                setEditingRound({
                  id: crypto.randomUUID(),
                  round: 'first',
                  date: new Date().toISOString().split('T')[0],
                  notes: '',
                  result: 'pending'
                })
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('resumes.add_round')}
            </Button>
          </div>
        )}
      </div>

      {editingRound && (
        <Dialog open={!!editingRound} onOpenChange={() => setEditingRound(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('resumes.edit_round')}</DialogTitle>
              <DialogDescription>{t('resumes.edit_round_description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('resumes.round')}</label>
                  <Select
                    value={editingRound.round}
                    onValueChange={(value) =>
                      setEditingRound((prev) =>
                        prev ? { ...prev, round: value as InterviewRound['round'] } : null
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">{t('resumes.round_first')}</SelectItem>
                      <SelectItem value="second">{t('resumes.round_second')}</SelectItem>
                      <SelectItem value="third">{t('resumes.round_third')}</SelectItem>
                      <SelectItem value="fourth">{t('resumes.round_fourth')}</SelectItem>
                      <SelectItem value="fifth">{t('resumes.round_fifth')}</SelectItem>
                      <SelectItem value="hr">{t('resumes.round_hr')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('resumes.result')}</label>
                  <Select
                    value={editingRound.result}
                    onValueChange={(value) =>
                      setEditingRound((prev) =>
                        prev ? { ...prev, result: value as InterviewRound['result'] } : null
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('resumes.result_pending')}</SelectItem>
                      <SelectItem value="passed">{t('resumes.result_passed')}</SelectItem>
                      <SelectItem value="failed">{t('resumes.result_failed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('resumes.date')}</label>
                <Input
                  type="date"
                  value={editingRound.date}
                  onChange={(e) =>
                    setEditingRound((prev) => (prev ? { ...prev, date: e.target.value } : null))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('resumes.interview_notes')}</label>
                <MarkdownEditor
                  value={editingRound.notes}
                  onChange={(value) =>
                    setEditingRound((prev) => (prev ? { ...prev, notes: value } : null))
                  }
                  minHeight="150px"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRound(null)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveRound}>{t('common.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t('resumes.delete_round_confirm_title')}
        description={t('resumes.delete_round_confirm_desc')}
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </>
  )
}
