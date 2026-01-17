import { useMemo } from 'react'
import { X, FileDiff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header' | 'hunk'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

function parseDiff(diff: string): DiffLine[] {
  const lines = diff.split('\n')
  const result: DiffLine[] = []
  let oldLine = 0
  let newLine = 0

  for (const line of lines) {
    if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      result.push({ type: 'header', content: line })
    } else if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (match) {
        oldLine = parseInt(match[1], 10)
        newLine = parseInt(match[2], 10)
      }
      result.push({ type: 'hunk', content: line })
    } else if (line.startsWith('+')) {
      result.push({ type: 'add', content: line.substring(1), newLineNumber: newLine })
      newLine++
    } else if (line.startsWith('-')) {
      result.push({ type: 'remove', content: line.substring(1), oldLineNumber: oldLine })
      oldLine++
    } else if (line.startsWith(' ') || line === '') {
      result.push({ type: 'context', content: line.substring(1) || '', oldLineNumber: oldLine, newLineNumber: newLine })
      oldLine++
      newLine++
    }
  }

  return result
}

function DiffLineComponent({ line }: { line: DiffLine }) {
  if (line.type === 'header') {
    return (
      <div className="px-4 py-1 bg-muted/50 text-muted-foreground text-xs font-mono truncate">
        {line.content}
      </div>
    )
  }

  if (line.type === 'hunk') {
    return (
      <div className="px-4 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono">
        {line.content}
      </div>
    )
  }

  const bgClass = line.type === 'add' 
    ? 'bg-green-500/10' 
    : line.type === 'remove' 
      ? 'bg-red-500/10' 
      : ''

  const textClass = line.type === 'add'
    ? 'text-green-600 dark:text-green-400'
    : line.type === 'remove'
      ? 'text-red-600 dark:text-red-400'
      : 'text-foreground'

  return (
    <div className={cn('flex font-mono text-sm', bgClass)}>
      <div className="flex-shrink-0 w-20 flex text-xs text-muted-foreground select-none">
        <span className="w-10 px-2 text-right border-r border-border/50">
          {line.oldLineNumber || ''}
        </span>
        <span className="w-10 px-2 text-right border-r border-border/50">
          {line.newLineNumber || ''}
        </span>
      </div>
      <div className="w-6 flex-shrink-0 flex items-center justify-center">
        {line.type === 'add' && <div className="w-3 h-3 rounded-full bg-green-500" />}
        {line.type === 'remove' && <div className="w-3 h-3 rounded-full bg-red-500" />}
      </div>
      <pre className={cn('flex-1 px-2 py-0.5 whitespace-pre-wrap break-all', textClass)}>
        {line.content || ' '}
      </pre>
    </div>
  )
}

export function GitDiffView({ diff, filePath, isLoading, onClose }: { diff: string; filePath: string; isLoading?: boolean; onClose?: () => void }) {
  const diffLines = useMemo(() => parseDiff(diff), [diff])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
        <FileDiff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{filePath}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {!diff || diff.trim().length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No changes to display</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30 pb-32">
            {diffLines.map((line, index) => (
              <DiffLineComponent key={index} line={line} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
