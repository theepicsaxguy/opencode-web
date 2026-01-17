import type { GitFileStatus, GitFileStatusType } from '@/types/git'

export interface GitTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children: GitTreeNode[]
  file?: GitFileStatus
  fileCount: number
  statusCounts: Partial<Record<GitFileStatusType, number>>
}

export function buildTree(files: GitFileStatus[]): GitTreeNode[] {
  const root: GitTreeNode[] = []
  const nodeMap = new Map<string, GitTreeNode>()

  for (const file of files) {
    const isDirectoryPath = file.path.endsWith('/')
    const cleanPath = isDirectoryPath ? file.path.slice(0, -1) : file.path
    const parts = cleanPath.split('/').filter(p => p)
    
    if (parts.length === 0) continue
    
    let currentPath = ''
    let currentLevel = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : part

      let node = nodeMap.get(currentPath)
      if (!node) {
        const isDir = !isLast || isDirectoryPath
        node = {
          name: part,
          path: currentPath,
          isDirectory: isDir,
          children: [],
          file: (isLast && !isDirectoryPath) ? file : undefined,
          fileCount: 0,
          statusCounts: isDirectoryPath && isLast ? { [file.status]: 1 } : {},
        }
        nodeMap.set(currentPath, node)
        currentLevel.push(node)
      } else if (isLast && isDirectoryPath) {
        node.statusCounts[file.status] = (node.statusCounts[file.status] || 0) + 1
      }

      if (isLast && !isDirectoryPath) {
        node.file = file
        node.isDirectory = false
      }

      currentLevel = node.children
    }
  }

  function aggregateCounts(node: GitTreeNode): void {
    if (node.isDirectory) {
      const existingCounts = { ...node.statusCounts }
      node.fileCount = 0
      node.statusCounts = {}
      
      if (node.children.length === 0) {
        node.statusCounts = existingCounts
        node.fileCount = Object.values(existingCounts).reduce((a, b) => a + (b || 0), 0) || 1
      } else {
        for (const child of node.children) {
          aggregateCounts(child)
          node.fileCount += child.isDirectory ? child.fileCount : 1
          for (const [status, count] of Object.entries(child.statusCounts)) {
            node.statusCounts[status as GitFileStatusType] = 
              (node.statusCounts[status as GitFileStatusType] || 0) + (count as number)
          }
          if (child.file) {
            node.statusCounts[child.file.status] = 
              (node.statusCounts[child.file.status] || 0) + 1
          }
        }
      }
    }
  }

  function sortNodes(nodes: GitTreeNode[]): GitTreeNode[] {
    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    }).map(node => ({
      ...node,
      children: sortNodes(node.children)
    }))
  }

  for (const node of root) {
    aggregateCounts(node)
  }

  return sortNodes(root)
}

export function filterTree(nodes: GitTreeNode[], filter: GitFileStatusType | 'all'): GitTreeNode[] {
  if (filter === 'all') return nodes

  return nodes
    .map(node => {
      if (node.isDirectory) {
        const filteredChildren = filterTree(node.children, filter)
        if (filteredChildren.length === 0) return null
        return { ...node, children: filteredChildren }
      }
      return node.file?.status === filter ? node : null
    })
    .filter((node): node is GitTreeNode => node !== null)
}