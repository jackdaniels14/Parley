import { useState } from 'react'
import { Card, Button, TextArea, StanceBadge } from '../common'
import { useCreatePost } from '../../hooks'
import type { PostStance } from '../../types'
import clsx from 'clsx'

interface PostComposerProps {
  debateId: string
  onCancel: () => void
  onSuccess: () => void
}

const stanceOptions: { value: PostStance; label: string; description: string; borderColor: string }[] = [
  { value: 'support', label: 'Support', description: 'I agree with this position', borderColor: 'border-green-400 bg-green-50' },
  { value: 'oppose', label: 'Oppose', description: 'I disagree with this position', borderColor: 'border-red-400 bg-red-50' },
  { value: 'mixed', label: "It's complicated", description: 'I have a nuanced view', borderColor: 'border-amber-400 bg-amber-50' },
]

export default function PostComposer({
  debateId,
  onCancel,
  onSuccess,
}: PostComposerProps) {
  const [step, setStep] = useState(1)
  const [stance, setStance] = useState<PostStance | null>(null)
  const [position, setPosition] = useState('')
  const [reasoning, setReasoning] = useState('')

  const createPost = useCreatePost(debateId)

  const handleSubmit = () => {
    if (!stance || !position || !reasoning) return

    createPost.mutate(
      { stance, position, reasoning },
      {
        onSuccess: () => {
          onSuccess()
        },
      }
    )
  }

  const canProceed = () => {
    if (step === 1) return stance !== null
    if (step === 2) return position.length >= 20
    if (step === 3) return reasoning.length >= 50
    return false
  }

  return (
    <Card padding="lg" className="animate-fade-in">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Share your opinion
      </h3>

      {/* Step indicator - connected circles */}
      <div className="flex items-center justify-center mb-6">
        {[1, 2, 3, 4].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                s < step
                  ? 'bg-primary-600 text-white'
                  : s === step
                  ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
              )}
            >
              {s < step ? '✓' : s}
            </div>
            {i < 3 && (
              <div
                className={clsx(
                  'w-8 h-0.5 mx-1',
                  s < step ? 'bg-primary-600' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select stance */}
      {step === 1 && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            What's your position on this topic?
          </p>
          {stanceOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStance(option.value)}
              className={clsx(
                'w-full p-5 rounded-xl border-2 text-left transition-all',
                stance === option.value
                  ? option.borderColor
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              )}
            >
              <div className="font-semibold text-gray-900 dark:text-gray-100">{option.label}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{option.description}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: State position */}
      {step === 2 && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            State your position clearly
          </p>
          <TextArea
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="I think..."
            rows={3}
            hint={`${position.length}/20 characters minimum`}
          />
        </div>
      )}

      {/* Step 3: Provide reasoning */}
      {step === 3 && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Explain your reasoning
          </p>
          <TextArea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Because..."
            rows={5}
            hint={`${reasoning.length}/50 characters minimum`}
          />
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Review your opinion</p>

          <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Stance:</span>
              <StanceBadge stance={stance!} />
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Position</span>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{position}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Reasoning</span>
              <p className="text-gray-700 dark:text-gray-300">{reasoning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="ghost"
          onClick={step === 1 ? onCancel : () => setStep(step - 1)}
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        {step < 4 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={createPost.isPending}
          >
            Post Opinion
          </Button>
        )}
      </div>
    </Card>
  )
}
