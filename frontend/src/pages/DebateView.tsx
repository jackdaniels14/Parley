import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useDebateStore } from '../store/debate'
import { onDebateSnapshot, onDebateArgumentsSnapshot, getDebateRounds } from '../services/firestore'
import { submitArgumentFn, joinDebateFn, startDebateFn } from '../services/functions'
import { Card, Loading, Button } from '../components/common'
import FormatBadge from '../components/common/FormatBadge'
import StatusBadge from '../components/common/StatusBadge'
import Timer from '../components/common/Timer'
import ScoreBar from '../components/common/ScoreBar'
import ArgumentCard from '../components/debate/ArgumentCard'
import ArgumentComposer from '../components/debate/ArgumentComposer'
import VoteForm from '../components/debate/VoteForm'
import VideoCallPanel from '../components/debate/VideoCallPanel'
import type { Debate, Argument, Round, Side } from '../types'

export default function DebateView() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { timeRemaining, startTimer, stopTimer, reset } = useDebateStore()

  const [debate, setDebate] = useState<Debate | null>(null)
  const [args, setArgs] = useState<Argument[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [joinSide, setJoinSide] = useState<Side>('against')
  const [joinPosition, setJoinPosition] = useState('')

  // Real-time debate subscription
  useEffect(() => {
    if (!id) return
    const unsubDebate = onDebateSnapshot(id, (d) => {
      setDebate(d)
      setLoading(false)
    })
    const unsubArgs = onDebateArgumentsSnapshot(id, setArgs)

    return () => {
      unsubDebate()
      unsubArgs()
      reset()
    }
  }, [id, reset])

  // Fetch rounds when debate loads
  useEffect(() => {
    if (!id || !debate) return
    getDebateRounds(id).then(setRounds)
  }, [id, debate?.currentRound])

  // Timer management
  useEffect(() => {
    if (!debate || debate.status !== 'active' || rounds.length === 0) {
      stopTimer()
      return
    }
    const currentRound = rounds.find((r) => r.roundNumber === debate.currentRound)
    if (currentRound?.deadline) {
      const remaining = Math.max(0, Math.floor((new Date(currentRound.deadline).getTime() - Date.now()) / 1000))
      startTimer(remaining)
    }
  }, [debate?.currentRound, rounds, debate?.status, startTimer, stopTimer])

  // Determine user's role
  const mySide = useMemo<Side | null>(() => {
    if (!user || !debate) return null
    if (debate.forSide.teamMembers.some((m) => m.uid === user.id)) return 'for'
    if (debate.againstSide.teamMembers.some((m) => m.uid === user.id)) return 'against'
    return null
  }, [user, debate])

  const isMyTurn = useMemo(() => {
    if (!mySide || !debate || debate.status !== 'active') return false
    const currentRound = rounds.find((r) => r.roundNumber === debate.currentRound)
    return currentRound?.currentTurnSide === mySide
  }, [mySide, debate, rounds])

  const hasSubmittedThisRound = useMemo(() => {
    if (!user || !debate) return false
    return args.some(
      (a) => a.userId === user.id && a.roundNumber === debate.currentRound
    )
  }, [user, debate, args])

  // Group arguments by round
  const argsByRound = useMemo(() => {
    const map = new Map<number, { for: Argument[]; against: Argument[] }>()
    for (const arg of args) {
      if (!map.has(arg.roundNumber)) {
        map.set(arg.roundNumber, { for: [], against: [] })
      }
      map.get(arg.roundNumber)![arg.side].push(arg)
    }
    return map
  }, [args])

  async function handleSubmitArgument(data: {
    claim: string
    reasoning: string
    evidence: string
    sources: string[]
    acknowledgesOpponentPoint: boolean
    concessionText: string
  }) {
    if (!id) return
    setIsSubmitting(true)
    try {
      await submitArgumentFn({
        debateId: id,
        ...data,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleJoin() {
    if (!id || !joinPosition.trim()) return
    setIsJoining(true)
    try {
      await joinDebateFn({ debateId: id, side: joinSide, position: joinPosition })
    } finally {
      setIsJoining(false)
    }
  }

  async function handleStart() {
    if (!id) return
    await startDebateFn(id)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size="lg" />
      </div>
    )
  }

  if (!debate) {
    return (
      <Card className="py-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Debate not found.</p>
      </Card>
    )
  }

  const forAiAvg = args.filter((a) => a.side === 'for' && a.aiScores).reduce((sum, a) => sum + (a.aiScores?.overallScore || 0), 0) / (args.filter((a) => a.side === 'for' && a.aiScores).length || 1)
  const againstAiAvg = args.filter((a) => a.side === 'against' && a.aiScores).reduce((sum, a) => sum + (a.aiScores?.overallScore || 0), 0) / (args.filter((a) => a.side === 'against' && a.aiScores).length || 1)

  return (
    <div className="space-y-6">
      {/* Debate Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <FormatBadge format={debate.format} size="md" />
          <StatusBadge status={debate.status} />
          {debate.status === 'active' && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-500">Round {debate.currentRound + 1}/{debate.totalRounds}</span>
              <Timer seconds={timeRemaining} className="text-lg" />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {debate.title}
        </h1>
        <p className="text-sm text-gray-500">{debate.topicName} — {debate.topicCategory}</p>

        {/* Score bar (if arguments exist with scores) */}
        {args.some((a) => a.aiScores) && (
          <div className="mt-4">
            <ScoreBar forScore={forAiAvg} againstScore={againstAiAvg} label="AI Score Average" />
          </div>
        )}

        {/* Sides display */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
            <div className="text-xs font-bold uppercase text-green-600 dark:text-green-400 mb-1">FOR</div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{debate.forSide.position || 'No position stated'}</p>
            {debate.forSide.teamMembers.map((m) => (
              <span key={m.uid} className="text-xs text-gray-600 dark:text-gray-400">{m.username} </span>
            ))}
            {debate.forSide.teamMembers.length === 0 && (
              <span className="text-xs italic text-gray-400">Waiting for player...</span>
            )}
          </div>

          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <div className="text-xs font-bold uppercase text-red-600 dark:text-red-400 mb-1">AGAINST</div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{debate.againstSide.position || 'No position stated'}</p>
            {debate.againstSide.teamMembers.map((m) => (
              <span key={m.uid} className="text-xs text-gray-600 dark:text-gray-400">{m.username} </span>
            ))}
            {debate.againstSide.teamMembers.length === 0 && (
              <span className="text-xs italic text-gray-400">Waiting for player...</span>
            )}
          </div>
        </div>
      </div>

      {/* Setup phase: Join or Start */}
      {debate.status === 'setup' && (
        <Card>
          {!mySide ? (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Join this debate</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setJoinSide('for')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${joinSide === 'for' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                >
                  FOR
                </button>
                <button
                  onClick={() => setJoinSide('against')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${joinSide === 'against' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                >
                  AGAINST
                </button>
              </div>
              <textarea
                value={joinPosition}
                onChange={(e) => setJoinPosition(e.target.value)}
                placeholder="State your position..."
                className="w-full rounded-lg border border-gray-300 p-3 text-sm dark:border-gray-600 dark:bg-gray-700"
                rows={3}
              />
              <Button onClick={handleJoin} disabled={isJoining || !joinPosition.trim()}>
                {isJoining ? 'Joining...' : 'Join Debate'}
              </Button>
            </div>
          ) : debate.createdBy === user?.id && debate.forSide.teamMembers.length > 0 && debate.againstSide.teamMembers.length > 0 ? (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-3">Both sides are ready!</p>
              <Button onClick={handleStart}>Start Debate</Button>
            </div>
          ) : (
            <p className="text-center text-gray-500">Waiting for opponent to join...</p>
          )}
        </Card>
      )}

      {/* Video call panel for video-format debates */}
      {debate.format === 'video' && debate.status === 'active' && mySide !== null && (
        <VideoCallPanel debateId={debate.id} side={mySide} debate={debate} />
      )}

      {/* Arguments by round */}
      {(debate.status === 'active' || debate.status === 'voting' || debate.status === 'completed') && (
        <div className="space-y-6">
          {Array.from({ length: Math.max(debate.currentRound + 1, 1) }).map((_, roundNum) => {
            const roundArgs = argsByRound.get(roundNum)
            return (
              <div key={roundNum}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-3">
                  Round {roundNum + 1}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-green-600 dark:text-green-400">FOR</div>
                    {roundArgs?.for.map((arg) => (
                      <ArgumentCard key={arg.id} argument={arg} />
                    ))}
                    {(!roundArgs?.for || roundArgs.for.length === 0) && (
                      <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center text-sm text-gray-400 dark:border-gray-700">
                        {debate.status === 'active' && roundNum === debate.currentRound
                          ? 'Waiting for argument...'
                          : 'No argument submitted'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-red-600 dark:text-red-400">AGAINST</div>
                    {roundArgs?.against.map((arg) => (
                      <ArgumentCard key={arg.id} argument={arg} />
                    ))}
                    {(!roundArgs?.against || roundArgs.against.length === 0) && (
                      <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center text-sm text-gray-400 dark:border-gray-700">
                        {debate.status === 'active' && roundNum === debate.currentRound
                          ? 'Waiting for argument...'
                          : 'No argument submitted'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Argument Composer (if it's my turn) */}
      {debate.status === 'active' && mySide && isMyTurn && !hasSubmittedThisRound && (
        <ArgumentComposer
          wordLimit={debate.wordLimit}
          side={mySide}
          onSubmit={handleSubmitArgument}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Waiting for opponent */}
      {debate.status === 'active' && mySide && !isMyTurn && !hasSubmittedThisRound && (
        <Card className="text-center py-6">
          <p className="text-gray-500">Waiting for your opponent's argument...</p>
        </Card>
      )}

      {/* Already submitted */}
      {debate.status === 'active' && mySide && hasSubmittedThisRound && (
        <Card className="text-center py-6">
          <p className="text-green-600 dark:text-green-400 font-medium">Argument submitted! Waiting for the round to advance.</p>
        </Card>
      )}

      {/* Spectator view during active */}
      {debate.status === 'active' && !mySide && (
        <Card className="text-center py-6">
          <p className="text-gray-500">You are spectating this debate.</p>
        </Card>
      )}

      {/* Voting phase — spectators vote inline */}
      {debate.status === 'voting' && !mySide && !hasVoted && (
        <VoteForm
          debateId={debate.id}
          forPosition={debate.forSide.position}
          againstPosition={debate.againstSide.position}
          onVoted={() => setHasVoted(true)}
        />
      )}
      {debate.status === 'voting' && !mySide && hasVoted && (
        <Card className="text-center py-6 space-y-3">
          <p className="text-green-600 dark:text-green-400 font-semibold">Thanks for voting!</p>
          <Link to={`/debate/${debate.id}/results`} className="text-sm text-primary-600 dark:text-violet-400 hover:underline">
            View results when available →
          </Link>
        </Card>
      )}
      {debate.status === 'voting' && mySide && (
        <Card className="text-center py-6 space-y-3">
          <p className="text-gray-500 dark:text-gray-400">Voting is open — crowd deciding the winner.</p>
          <Link to={`/debate/${debate.id}/results`} className="text-sm text-primary-600 dark:text-violet-400 hover:underline">
            View results when available →
          </Link>
        </Card>
      )}

      {/* Completed */}
      {debate.status === 'completed' && (
        <Card className="text-center py-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {debate.overallWinner === 'draw'
              ? 'This debate was a draw!'
              : `The ${debate.overallWinner === 'for' ? 'FOR' : 'AGAINST'} side won!`}
          </h3>
          <Link to={`/debate/${debate.id}/results`}>
            <Button>View Full Results</Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
