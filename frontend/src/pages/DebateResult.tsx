import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDebateResult } from '../services/firestore'
import { Card, Loading } from '../components/common'
import type { DebateResult as DebateResultType } from '../types'
import clsx from 'clsx'

function WinnerBanner({ result }: { result: DebateResultType }) {
  const isFor = result.overallWinner === 'for'
  const isDraw = result.overallWinner === 'draw'

  return (
    <div className={clsx(
      'rounded-xl p-6 text-center text-white',
      isDraw ? 'bg-gray-600' : isFor ? 'bg-green-600' : 'bg-red-600'
    )}>
      <p className="text-sm font-semibold uppercase tracking-widest opacity-80 mb-1">Overall Winner</p>
      <h1 className="text-3xl font-black">
        {isDraw ? 'DRAW' : isFor ? 'FOR SIDE WINS' : 'AGAINST SIDE WINS'}
      </h1>
      <p className="text-sm opacity-80 mt-1">{result.topicName}</p>
    </div>
  )
}

function VoteBar({ forVotes, againstVotes, drawVotes }: { forVotes: number; againstVotes: number; drawVotes: number }) {
  const total = forVotes + againstVotes + drawVotes || 1
  const forPct = Math.round((forVotes / total) * 100)
  const againstPct = Math.round((againstVotes / total) * 100)
  const drawPct = 100 - forPct - againstPct

  return (
    <div className="space-y-2">
      <div className="flex rounded-full overflow-hidden h-4">
        <div className="bg-green-500 transition-all" style={{ width: `${forPct}%` }} />
        <div className="bg-gray-400 transition-all" style={{ width: `${drawPct}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${againstPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span className="text-green-600 dark:text-green-400 font-medium">FOR {forPct}%</span>
        {drawPct > 0 && <span>Draw {drawPct}%</span>}
        <span className="text-red-600 dark:text-red-400 font-medium">AGAINST {againstPct}%</span>
      </div>
    </div>
  )
}

export default function DebateResult() {
  const { id } = useParams<{ id: string }>()

  const { data: result, isLoading } = useQuery({
    queryKey: ['debateResult', id],
    queryFn: () => getDebateResult(id!),
    refetchInterval: (query) => (!query.state.data ? 5000 : false),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size="lg" />
      </div>
    )
  }

  if (!result) {
    return (
      <Card className="text-center py-12 space-y-3">
        <Loading size="lg" />
        <p className="text-gray-700 dark:text-gray-300 font-semibold">Calculating results...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This usually takes less than a minute. The page will update automatically.
        </p>
        <Link to={`/debate/${id}`} className="text-sm text-primary-600 dark:text-violet-400 hover:underline">
          Back to debate
        </Link>
      </Card>
    )
  }

  const { aiVerdict, crowdVerdict, roundScores, rankChanges } = result

  return (
    <div className="space-y-6">
      <WinnerBanner result={result} />

      {/* Crowd Verdict */}
      <Card>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">Crowd Verdict</h2>
        <VoteBar
          forVotes={crowdVerdict.forVotes}
          againstVotes={crowdVerdict.againstVotes}
          drawVotes={crowdVerdict.drawVotes}
        />
        <div className="mt-3 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>{crowdVerdict.totalVoters} voters</span>
          {crowdVerdict.mindChangedCount > 0 && (
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              {crowdVerdict.mindChangedCount} changed their mind
            </span>
          )}
        </div>
      </Card>

      {/* AI Verdict */}
      <Card>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">AI Verdict</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
          {aiVerdict.reasoning}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* FOR strengths/weaknesses */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">FOR</div>
            {aiVerdict.forStrengths.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Strengths</p>
                <ul className="space-y-1">
                  {aiVerdict.forStrengths.map((s, i) => (
                    <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-1.5">
                      <span className="text-green-500 shrink-0">+</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiVerdict.forWeaknesses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Weaknesses</p>
                <ul className="space-y-1">
                  {aiVerdict.forWeaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-1.5">
                      <span className="text-red-400 shrink-0">−</span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {/* AGAINST strengths/weaknesses */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">AGAINST</div>
            {aiVerdict.againstStrengths.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Strengths</p>
                <ul className="space-y-1">
                  {aiVerdict.againstStrengths.map((s, i) => (
                    <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-1.5">
                      <span className="text-green-500 shrink-0">+</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiVerdict.againstWeaknesses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Weaknesses</p>
                <ul className="space-y-1">
                  {aiVerdict.againstWeaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-1.5">
                      <span className="text-red-400 shrink-0">−</span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Round Scores */}
      {roundScores.length > 0 && (
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">Round Scores</h2>
          <div className="space-y-2">
            {roundScores.map((rs) => {
              const total = rs.forScore + rs.againstScore || 1
              const forPct = Math.round((rs.forScore / total) * 100)
              return (
                <div key={rs.roundNumber} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-16 shrink-0">Round {rs.roundNumber + 1}</span>
                  <div className="flex-1 flex rounded-full overflow-hidden h-3 bg-gray-100 dark:bg-gray-700">
                    <div className="bg-green-500" style={{ width: `${forPct}%` }} />
                    <div className="bg-red-500" style={{ width: `${100 - forPct}%` }} />
                  </div>
                  <div className="flex gap-2 text-xs w-24 justify-end shrink-0">
                    <span className="text-green-600 dark:text-green-400">{rs.forScore.toFixed(0)}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-red-600 dark:text-red-400">{rs.againstScore.toFixed(0)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Rank Changes */}
      {rankChanges.length > 0 && (
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">Rank Changes</h2>
          <div className="space-y-2">
            {rankChanges.map((rc) => (
              <div key={rc.uid} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-800 dark:text-gray-200">@{rc.username}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">{rc.previousRank}</span>
                  <span className="text-gray-400">→</span>
                  <span className={clsx(
                    'font-semibold text-xs',
                    rc.pointsDelta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {rc.newRank}
                  </span>
                  <span className={clsx(
                    'text-xs font-medium',
                    rc.pointsDelta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                  )}>
                    {rc.pointsDelta > 0 ? '+' : ''}{rc.pointsDelta}
                  </span>
                  {rc.isUpsetWin && (
                    <span className="text-yellow-500 text-xs">⚡ Upset!</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="text-center pb-4">
        <Link to={`/debate/${id}`} className="text-sm text-primary-600 dark:text-violet-400 hover:underline">
          ← Back to debate
        </Link>
      </div>
    </div>
  )
}
