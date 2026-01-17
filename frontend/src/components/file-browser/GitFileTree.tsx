import { useState } from 'react'
import { File, FileEdit, FilePlus, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GitFileStatus } from '@/types/git'

interface GitFileTreeProps {
  repoId: number | undefined
  files: GitFileStatus[]
  isStaged: boolean
  onStage: (paths: string[]) => void
  onUnstage: (paths: string[]) => void
  onSelectFile: (path: string) => void
}

const statusConfig = {
  modified: { icon: FileEdit, color: 'text-yellow-500', label: 'Modified' },
  added: { icon: FilePlus, color: 'text-green-500', label: 'Added' },
  deleted: { icon: Trash2, color: 'text-red-500', label: 'Deleted' },
  renamed: { icon: File, color: 'text-blue-500', label: 'Renamed' },
  untracked: { icon: File, color: 'text-muted-foreground', label: 'Untracked' },
  copied: { icon: File, color: 'text-purple-500', label: 'Copied' },
}

interface GitFileItemProps {
  file: GitFileStatus
  checked: boolean
  onCheck: (path: string) => void
  onUncheck: (path: string) => void
  onSelect: (path: string) => void
}

function GitFileItem({ file, checked, onCheck, onUncheck, onSelect }: GitFileItemProps) {
  const config = statusConfig[file.status]
  const Icon = config.icon

  const handleClick = () => {
    onSelect(file.path)
  }

  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (checked) {
      onUncheck(file.path)
    } else {
      onCheck(file.path)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors rounded-md group'
      )}
    >
      <button
        onClick={handleCheckClick}
        className={cn(
          'w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 transition-colors',
          checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary'
        )}
      >
        {checked && <Check className="w-3 h-3" />}
      </button>
      <Icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground truncate block">{file.path}</span>
        {file.oldPath && (
          <span className="text-xs text-muted-foreground truncate block">← {file.oldPath}</span>
        )}
      </div>
      <span className={cn('text-xs px-1.5 py-0.5 rounded', config.color)}>
        {config.label}
      </span>
    </button>
  )
}

export function GitFileTree({ repoId, files, isStaged, onStage, onUnstage, onSelectFile }: GitFileTreeProps) {
  void repoId
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())

  const handleStage = (path: string) => {
    onStage([path])
    setSelectedPaths(prev => {
      const next = new Set(prev)
      next.delete(path)
      return next
    })
  }

  const handleUnstage = (path: string) => {
    onUnstage([path])
    setSelectedPaths(prev => {
      const next = new Set(prev)
      next.delete(path)
      return next
    })
  }

  const handleSelectFile = (path: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
    onSelectFile(path)
  }

  const groupTitle = isStaged ? 'Staged Changes' : 'Unstaged Changes'

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No {groupTitle.toLowerCase()}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium text-foreground">{groupTitle}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-0.5 p-2">
          {files.map(file => (
            <GitFileItem
              key={file.path}
              file={file}
              checked={selectedPaths.has(file.path)}
              onCheck={handleStage}
              onUncheck={handleUnstage}
              onSelect={handleSelectFile}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
