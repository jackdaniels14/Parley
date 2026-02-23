import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import { submitVote, getUserVote } from '../../services/firestore'
import { Card, Button } from '../common'
import type { VoteChoice, CategoryVote, Side } from '../../types'
import clsx from 'clsx'

interface VoteFormProps {
  debateId: string
  forPosition: string
  againstPosition: string
  onVoted: () => void
}

type LocalCategoryVote = 'for' | 'equal' | 'against'

const WinnerButton = ({
  value, current, label, color, onClick,
}: {
  value: VoteChoice; current: VoteChoice | null; label: string; color: string; onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'flex-1 rounded-lg border-2 py-3 text-sm font-bold transition-all',
      current === value
        ? `${color} text-white border-transparent shadow-md scale-105`
        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
    )}
  >
    {label}
  </button>
)

const CategoryRow = ({
  label, value, onChange,
}: {
  label: string; value: LocalCategoryVote | null; onChange: (v: LocalCategoryVote) => void
}) => (
  <div className="flex items-center gap-3">
    <span className="w-32 text-sm text-gray-600 dark:text-gray-400 shrink-0">{label}</span>
    <div className="flex flex-1 gap-1">
      {(['for', 'equal', 'against'] as LocalCategoryVote[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={clsx(
            'flex-1 rounded py-1.5 text-xs font-semibold transition-all border',
            value === v
              ? v === 'for'
                ? 'bg-green-500 text-white border-transparent'
                : v === 'against'
                ? 'bg-red-500 text-white border-transparent'
                : 'bg-gray-500 text-white border-transparent'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
        >
          {v === 'for' ? 'FOR' : v === 'equal' ? 'EQUAL' : 'AGAINST'}
        </button>
      ))}
    </div>
  </div>
)

export default function VoteForm({ debateId, forPosition, againstPosition, onVoted }: VoteFormProps) {
  const user = useAuthStore((s) => s.user)

  const [winner, setWinner] = useState<VoteChoice | null>(null)
  const [logic, setLogic] = useState<LocalCategoryVote | null>(null)
  const [evidence, setEvidence] = useState<LocalCategoryVote | null>(null)
  const [onTopic, setOnTopic] = useState<LocalCategoryVote | null>(null)
  const [respectful, setRespectful] = useState<LocalCategoryVote | null>(null)
  const [changedMind, setChangedMind] = useState(false)
  const [previousStance, setPreviousStance] = useState<Side | 'neutral'>('neutral')
  const [newStance, setNewStance] = useState<Side | 'neutral'>('neutral')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserVote(debateId, user.id)
      .then((v) => { if (v) setAlreadyVoted(true) })
      .finally(() => setChecking(false))
  }, [debateId, user])

  const allCategoriesFilled = logic && evidence && onTopic && respectful
  const canSubmit = winner && allCategoriesFilled

  async function handleSubmit() {
    if (!user || !winner || !logic || !evidence || !onTopic || !respectful) return
    setIsSubmitting(true)
    try {
      await submitVote({
        debateId,
        voterId: user.id,
        persuasivenessWinner: winner,
        betterLogic: logic as CategoryVote,
        betterEvidence: evidence as CategoryVote,
        moreOnTopic: onTopic as CategoryVote,
        moreRespectful: respectful as CategoryVote,
        changedMind,
        previousStance: changedMind ? previousStance : null,
        newStance: changedMind ? newStance : null,
        voterJudgeScore: user.judgeScore,
      })
      onVoted()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (checking) return null

  if (alreadyVoted) {
    return (
      <Card className="text-center py-6">
        <p className="text-green-600 dark:text-green-400 font-medium">You've already voted in this debate.</p>
      </Card>
    )
  }

  return (
    <Card className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Cast Your Vote</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Judge both sides on their arguments, not their position.
        </p>
      </div>

      {/* Section 1: Overall winner */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Who was more persuasive overall?
        </p>
        <div className="flex gap-2">
          <WinnerButton value="for" current={winner} label="FOR" color="bg-green-500" onClick={() => setWinner('for')} />
          <WinnerButton value="draw" current={winner} label="DRAW" color="bg-gray-500" onClick={() => setWinner('draw')} />
          <WinnerButton value="against" current={winner} label="AGAINST" color="bg-red-500" onClick={() => setWinner('against')} />
        </div>
        {winner && (
          <p className="mt-2 text-xs text-gray-400 text-center">
            {winner === 'for'
              ? `"${forPosition.slice(0, 60)}${forPosition.length > 60 ? '...' : ''}"`
              : winner === 'against'
              ? `"${againstPosition.slice(0, 60)}${againstPosition.length > 60 ? '...' : ''}"`
              : 'It was a tie'}
          </p>
        )}
      </div>

      {/* Section 2: Category votes */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Score each category
        </p>
        <div className="space-y-2">
          <CategoryRow label="Better Logic" value={logic} onChange={setLogic} />
          <CategoryRow label="Better Evidence" value={evidence} onChange={setEvidence} />
          <CategoryRow label="More On Topic" value={onTopic} onChange={setOnTopic} />
          <CategoryRow label="More Respectful" value={respectful} onChange={setRespectful} />
        </div>
      </div>

      {/* Section 3: Mind change */}
      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={changedMind}
            onChange={(e) => setChangedMind(e.target.checked)}
            className="rounded border-gray-300 text-primary-600"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            This debate changed my mind
          </span>
        </label>
        {changedMind && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">I previously leaned</label>
              <select
                value={previousStance}
                onChange={(e) => setPreviousStance(e.target.value as Side | 'neutral')}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2 py-1.5"
              >
                <option value="for">FOR</option>
                <option value="against">AGAINST</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Now I lean</label>
              <select
                value={newStance}
                onChange={(e) => setNewStance(e.target.value as Side | 'neutral')}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2 py-1.5"
              >
                <option value="for">FOR</option>
                <option value="against">AGAINST</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Vote'}
      </Button>
    </Card>
  )
}
