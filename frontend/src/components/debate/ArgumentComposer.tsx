import { useState } from 'react'
import { Button, TextArea, Input } from '../common'
import clsx from 'clsx'

interface ArgumentComposerProps {
  wordLimit: number
  side: 'for' | 'against'
  onSubmit: (data: {
    claim: string
    reasoning: string
    evidence: string
    sources: string[]
    acknowledgesOpponentPoint: boolean
    concessionText: string
  }) => Promise<void>
  isSubmitting: boolean
}

const STEPS = ['Claim', 'Reasoning', 'Evidence', 'Concession', 'Preview']

export default function ArgumentComposer({ wordLimit, side, onSubmit, isSubmitting }: ArgumentComposerProps) {
  const [step, setStep] = useState(0)
  const [claim, setClaim] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [evidence, setEvidence] = useState('')
  const [sourceInput, setSourceInput] = useState('')
  const [sources, setSources] = useState<string[]>([])
  const [acknowledges, setAcknowledges] = useState(false)
  const [concessionText, setConcessionText] = useState('')
  const [error, setError] = useState('')

  const totalWords = `${claim} ${reasoning} ${evidence}`.split(/\s+/).filter(Boolean).length
  const overLimit = totalWords > wordLimit

  function addSource() {
    const trimmed = sourceInput.trim()
    if (trimmed && !sources.includes(trimmed)) {
      setSources([...sources, trimmed])
      setSourceInput('')
    }
  }

  async function handleSubmit() {
    setError('')
    try {
      await onSubmit({
        claim: claim.trim(),
        reasoning: reasoning.trim(),
        evidence: evidence.trim(),
        sources,
        acknowledgesOpponentPoint: acknowledges,
        concessionText: concessionText.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit argument')
    }
  }

  const canAdvance = () => {
    switch (step) {
      case 0: return claim.trim().length >= 10 && claim.length <= 200
      case 1: return reasoning.trim().length >= 20 && reasoning.length <= 1000
      case 2: return evidence.trim().length > 0 && evidence.length <= 1500
      case 3: return true
      case 4: return !overLimit
      default: return false
    }
  }

  const sideColor = side === 'for'
    ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
    : 'border-red-500 bg-red-50 dark:bg-red-900/10'

  return (
    <div className={clsx('rounded-xl border-2 p-5', sideColor)}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Your Argument ({side === 'for' ? 'FOR' : 'AGAINST'})
        </h3>
        {/* Step indicator */}
        <div className="mt-3 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => i <= step && setStep(i)}
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  i < step
                    ? 'bg-primary-500 text-white'
                    : i === step
                      ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500 dark:bg-primary-900 dark:text-primary-300'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                )}
              >
                {i < step ? '✓' : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <div className={clsx(
                  'h-0.5 w-4',
                  i < step ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                )} />
              )}
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">{STEPS[step]}</p>
      </div>

      {/* Step content */}
      {step === 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            What is your core assertion? (10-200 chars)
          </label>
          <TextArea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="State your claim clearly and concisely..."
            rows={2}
            maxLength={200}
          />
          <div className="text-xs text-gray-400 text-right">{claim.length}/200</div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Why is your claim true? (20-1000 chars)
          </label>
          <TextArea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Explain the logical reasoning behind your claim..."
            rows={5}
            maxLength={1000}
          />
          <div className="text-xs text-gray-400 text-right">{reasoning.length}/1000</div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            What evidence supports this? (max 1500 chars)
          </label>
          <TextArea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Cite data, studies, examples, or sources..."
            rows={5}
            maxLength={1500}
          />
          <div className="text-xs text-gray-400 text-right">{evidence.length}/1500</div>

          {/* Source URLs */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sources (optional)</label>
            <div className="flex gap-2">
              <Input
                value={sourceInput}
                onChange={(e) => setSourceInput(e.target.value)}
                placeholder="https://..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSource())}
              />
              <Button onClick={addSource} className="shrink-0">Add</Button>
            </div>
            {sources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {sources.map((src, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">
                    [{i + 1}] {new URL(src).hostname}
                    <button onClick={() => setSources(sources.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">x</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Acknowledging strong opponent points earns respect and bonus scoring points.
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledges}
              onChange={(e) => setAcknowledges(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              I acknowledge a valid point from my opponent
            </span>
          </label>
          {acknowledges && (
            <TextArea
              value={concessionText}
              onChange={(e) => setConcessionText(e.target.value)}
              placeholder="What point do you acknowledge? This shows intellectual honesty..."
              rows={3}
            />
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Preview your argument:</h4>

          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700 space-y-2">
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase">Claim</span>
              <p className="font-semibold text-gray-900 dark:text-white">{claim}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase">Reasoning</span>
              <p className="text-sm text-gray-700 dark:text-gray-300">{reasoning}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase">Evidence</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">{evidence}</p>
            </div>
            {acknowledges && concessionText && (
              <div className="rounded bg-purple-50 p-2 dark:bg-purple-900/20">
                <span className="text-xs font-medium text-purple-600">Concession:</span>
                <p className="text-sm text-purple-700 dark:text-purple-300 italic">"{concessionText}"</p>
              </div>
            )}
          </div>

          <div className={clsx('text-sm font-medium', overLimit ? 'text-red-600' : 'text-gray-500')}>
            Word count: {totalWords}/{wordLimit}
            {overLimit && ' — over limit!'}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Navigation buttons */}
      <div className="mt-4 flex items-center justify-between">
        <Button
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          className="bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
        >
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canAdvance()}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canAdvance() || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Argument'}
          </Button>
        )}
      </div>
    </div>
  )
}
