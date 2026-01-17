import { GitCommit, Clock, User, Loader2 } from 'lucide-react'

interface GitLogViewProps {
  commits: import('@/types/git').GitCommit[]
  onSelectCommit?: (commit: import('@/types/git').GitCommit) => void
  onLoadMore?: () => void
  isLoading?: boolean
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (diffSecs < 60) {
    return rtf.format(-diffSecs, 'second')
  }
  if (diffMins < 60) {
    return rtf.format(-diffMins, 'minute')
  }
  if (diffHours < 24) {
    return rtf.format(-diffHours, 'hour')
  }
  if (diffDays < 7) {
    return rtf.format(-diffDays, 'day')
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return rtf.format(-weeks, 'week')
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return rtf.format(-months, 'month')
  }
  const years = Math.floor(diffDays / 365)
  return rtf.format(-years, 'year')
}

export function GitLogView({ commits, onSelectCommit, onLoadMore, isLoading }: GitLogViewProps) {
  if (isLoading && commits.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isLoading && commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <GitCommit className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No commits yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {commits.map((commit) => (
        <button
          key={commit.hash}
          onClick={() => onSelectCommit?.(commit)}
          className="w-full text-left hover:bg-accent/50 transition-colors first:rounded-t-md last:rounded-b-md"
        >
          <div className="px-3 py-2 space-y-1.5 border-b border-border/50 last:border-0">
            <div className="flex items-start gap-2">
              <GitCommit className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{commit.hash.slice(0, 7)}</span>
                  <span className="text-sm font-medium text-foreground truncate flex-1">{commit.message}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-muted-foreground text-xs">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="truncate">{commit.authorName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(commit.date)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </button>
      ))}
      {isLoading && commits.length > 0 && (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {onLoadMore && !isLoading && commits.length > 0 && (
        <button
          onClick={onLoadMore}
          className="w-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors last:rounded-b-md"
        >
          Load more commits
        </button>
      )}
    </div>
  )
}
