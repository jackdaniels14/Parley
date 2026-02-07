import { useParams, Link } from 'react-router-dom'
import { useDebate } from '../hooks'
import { DebateThread } from '../components/debate'
import { Loading, Card, Button } from '../components/common'
import { ChevronLeftIcon } from '../components/icons'

export default function Debate() {
  const { id } = useParams<{ id: string }>()
  const { data: debate, isLoading, error } = useDebate(id || '')

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size="lg" />
      </div>
    )
  }

  if (error || !debate) {
    return (
      <Card className="text-center py-8">
        <p className="text-red-600 dark:text-red-400 mb-4">
          {error ? 'Failed to load debate.' : 'Debate not found.'}
        </p>
        <Link to="/">
          <Button variant="secondary">Back to Home</Button>
        </Link>
      </Card>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
        <Link to="/" className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          <ChevronLeftIcon className="w-4 h-4" />
          Home
        </Link>
        {debate.topic?.category && (
          <>
            <span>/</span>
            <span>{debate.topic.category}</span>
          </>
        )}
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100 font-medium truncate max-w-[200px]">{debate.title}</span>
      </nav>

      <DebateThread debate={debate} />
    </div>
  )
}
