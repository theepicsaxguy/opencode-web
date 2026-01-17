import { useMemo } from 'react'
import type { GitFileStatus, GitFileStatusType } from '@/types/git'
import { GitTreeNodeItem } from './GitTreeNodeItem'
import { buildTree, filterTree } from './git-tree-utils'

interface GitFileTreeProps {
  selectedFile?: string
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  onSelect: (path: string) => void
  onStage: (path: string) => void
  onUnstage: (path: string) => void
  files: GitFileStatus[]
  filter: GitFileStatusType | 'all'
}

export function GitFileTree({ selectedFile, expandedPaths, onToggle, onSelect, onStage, onUnstage, files, filter }: GitFileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files])
  const filteredTree = useMemo(() => filterTree(tree, filter), [tree, filter])

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No changes to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5 pb-8">
      {filteredTree.map((node) => (
        <GitTreeNodeItem
          key={node.path}
          node={node}
          level={0}
          selectedFile={selectedFile}
          expandedPaths={expandedPaths}
          onToggle={onToggle}
          onSelect={onSelect}
          onStage={onStage}
          onUnstage={onUnstage}
        />
      ))}
    </div>
  )
}