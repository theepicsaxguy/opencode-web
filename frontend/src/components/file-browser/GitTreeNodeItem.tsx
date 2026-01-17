import { FileText, FilePlus, FileX, FileEdit, File, ChevronRight, ChevronDown, Folder, FolderOpen, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GitFileStatusType } from '@/types/git'
import { GitTreeNode } from './git-tree-utils'

const statusConfig: Record<GitFileStatusType, { icon: typeof FileText; color: string; label: string }> = {
  modified: { icon: FileEdit, color: 'text-yellow-500', label: 'Modified' },
  added: { icon: FilePlus, color: 'text-green-500', label: 'Added' },
  deleted: { icon: FileX, color: 'text-red-500', label: 'Deleted' },
  renamed: { icon: FileText, color: 'text-blue-500', label: 'Renamed' },
  untracked: { icon: File, color: 'text-muted-foreground', label: 'Untracked' },
  copied: { icon: FileText, color: 'text-purple-500', label: 'Copied' },
}

interface GitTreeNodeItemProps {
  node: GitTreeNode
  level: number
  selectedFile?: string
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  onSelect: (path: string) => void
  onStage: (path: string) => void
  onUnstage: (path: string) => void
}

export function GitTreeNodeItem({ node, level, selectedFile, expandedPaths, onToggle, onSelect, onStage, onUnstage }: GitTreeNodeItemProps) {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedFile === node.path

  if (node.isDirectory) {
    const statusEntries = Object.entries(node.statusCounts) as [GitFileStatusType, number][]
    const dominantStatus = statusEntries.length > 0 
      ? statusEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : null

    return (
      <div>
        <button
          onClick={() => onToggle(node.path)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors rounded-md'
          )}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
        >
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </span>
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-sm text-foreground truncate flex-1">{node.name}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {dominantStatus && (
              <span className={cn('text-[10px] px-1 py-0.5 rounded', statusConfig[dominantStatus].color)}>
                {node.fileCount}
              </span>
            )}
          </div>
        </button>
        {isExpanded && (
          <div>
            {node.children.map(child => (
              <GitTreeNodeItem
                key={child.path}
                node={child}
                level={level + 1}
                selectedFile={selectedFile}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                onSelect={onSelect}
                onStage={onStage}
                onUnstage={onUnstage}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const file = node.file!
  const config = statusConfig[file.status]
  const Icon = config.icon
  const isStaged = file.staged

  const handleStageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isStaged) {
      onUnstage(node.path)
    } else {
      onStage(node.path)
    }
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors rounded-md group',
        isSelected && 'bg-accent'
      )}
      style={{ paddingLeft: `${level * 12 + 12}px` }}
    >
      <span className="w-4 h-4 flex-shrink-0" />
      <Icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm text-foreground truncate">{node.name}</span>
          {isStaged && (
            <span className="text-[10px] px-1 py-0.5 bg-green-500/20 text-green-500 rounded">staged</span>
          )}
        </div>
        {file.oldPath && (
          <span className="text-xs text-muted-foreground truncate block">← {file.oldPath}</span>
        )}
      </div>
      <button
        onClick={handleStageClick}
        className={cn(
          'w-7 h-7 flex items-center justify-center rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
          isStaged ? 'text-red-500 hover:bg-red-500/10' : 'text-green-500 hover:bg-green-500/10'
        )}
      >
        {isStaged ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
      </button>
    </button>
  )
}