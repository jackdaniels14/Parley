import { useState } from 'react'
import { Card, Button, TextArea, Avatar } from '../common'
import { useReplyToPost } from '../../hooks'
import { useAuthStore } from '../../store/auth'
import type { ReplyStance } from '../../types'
import clsx from 'clsx'

interface ReplyFormProps {
  postId: string
  debateId: string
  onCancel: () => void
  onSuccess: () => void
}

const replyStances: { value: ReplyStance; label: string; prefix: string; color: string; activeColor: string }[] = [
  { value: 'disagree', label: 'Disagree', prefix: 'I disagree because...', color: 'text-red-700', activeColor: 'bg-red-500 text-white' },
  { value: 'partial_agree', label: 'Partial', prefix: 'I partially agree, but...', color: 'text-amber-700', activeColor: 'bg-amber-500 text-white' },
  { value: 'changed_mind', label: 'Changed Mind', prefix: 'I used to think that, but...', color: 'text-purple-700', activeColor: 'bg-purple-500 text-white' },
  { value: 'agree', label: 'Agree', prefix: 'I agree, and...', color: 'text-green-700', activeColor: 'bg-green-500 text-white' },
]

export default function ReplyForm({
  postId,
  debateId,
  onCancel,
  onSuccess,
}: ReplyFormProps) {
  const [stance, setStance] = useState<ReplyStance | null>(null)
  const [position, setPosition] = useState('')
  const [reasoning, setReasoning] = useState('')
  const { user } = useAuthStore()

  const replyMutation = useReplyToPost(debateId)

  const selectedStance = replyStances.find((s) => s.value === stance)

  const handleSubmit = () => {
    if (!stance || !position || !reasoning) return

    replyMutation.mutate(
      { postId, stance, position, reasoning },
      {
        onSuccess: () => {
          onSuccess()
        },
      }
    )
  }

  const isValid = stance && position.length >= 20 && reasoning.length >= 50

  const displayName = user?.displayName || user?.username || 'User'

  return (
    <Card padding="md" className="animate-slide-up">
      <div className="flex gap-3">
        <Avatar name={displayName} size="sm" className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 mb-3">Reply to this post</h4>

          {/* Stance selection */}
          <div className="flex flex-wrap gap-2 mb-4">
            {replyStances.map((option) => (
              <button
                key={option.value}
                onClick={() => setStance(option.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  stance === option.value
                    ? option.activeColor
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {stance && (
            <div className="space-y-3 animate-fade-in">
              <TextArea
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder={selectedStance?.prefix || 'Your position...'}
                rows={2}
                hint={`${position.length}/20 min`}
              />

              <TextArea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Explain your reasoning..."
                rows={3}
                hint={`${reasoning.length}/50 min`}
              />

              <div className="flex justify-end space-x-2">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!isValid}
                  loading={replyMutation.isPending}
                >
                  Reply
                </Button>
              </div>
            </div>
          )}

          {!stance && (
            <p className="text-sm text-gray-500">
              Select how you want to respond to continue
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
