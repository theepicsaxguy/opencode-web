import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchGit, pullGit, pushGit, commitGit, stageFiles, unstageFiles, fetchGitLog, fetchGitDiff, createBranch, switchBranch, GitError } from '@/api/git'
import { showToast } from '@/lib/toast'

export function useGit(repoId: number | undefined) {
  const queryClient = useQueryClient()

  const invalidateCache = (additionalKeys: string[] = []) => {
    if (!repoId) return
    const keys = ['gitStatus', 'fileDiff', 'gitLog', ...additionalKeys]
    keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key, repoId] }))
  }

  const handleError = (error: unknown, fallbackMessage: string) => {
    if (error instanceof GitError) {
      showToast.error(error.message)
    } else if (error instanceof Error) {
      showToast.error(error.message)
    } else {
      showToast.error(fallbackMessage)
    }
  }

  const fetch = useMutation({
    mutationFn: () => {
      if (!repoId) throw new Error('No repo ID')
      return fetchGit(repoId)
    },
    onSuccess: () => {
      invalidateCache()
      showToast.success('Fetch completed')
    },
    onError: (error) => handleError(error, 'Fetch failed')
  })

  const pull = useMutation({
    mutationFn: () => {
      if (!repoId) throw new Error('No repo ID')
      return pullGit(repoId)
    },
    onSuccess: () => {
      invalidateCache()
      showToast.success('Pull completed')
    },
    onError: (error) => handleError(error, 'Pull failed')
  })

  const push = useMutation({
    mutationFn: ({ setUpstream }: { setUpstream?: boolean }) => {
      if (!repoId) throw new Error('No repo ID')
      return pushGit(repoId, setUpstream)
    },
    onSuccess: (_, variables) => {
      invalidateCache()
      showToast.success(variables.setUpstream ? 'Branch published' : 'Push completed')
    },
    onError: (error) => handleError(error, 'Push failed')
  })

  const commit = useMutation({
    mutationFn: ({ message, stagedPaths }: { message: string; stagedPaths?: string[] }) => {
      if (!repoId) throw new Error('No repo ID')
      return commitGit(repoId, message, stagedPaths)
    },
    onSuccess: () => {
      invalidateCache()
      showToast.success('Commit created')
    },
    onError: (error) => handleError(error, 'Commit failed')
  })

  const stageFilesMutation = useMutation({
    mutationFn: (paths: string[]) => {
      if (!repoId) throw new Error('No repo ID')
      return stageFiles(repoId, paths)
    },
    onSuccess: (_, paths) => {
      invalidateCache()
      paths.forEach(path => showToast.success(`Staged: ${path}`))
    },
    onError: (error) => handleError(error, 'Failed to stage files')
  })

  const unstageFilesMutation = useMutation({
    mutationFn: (paths: string[]) => {
      if (!repoId) throw new Error('No repo ID')
      return unstageFiles(repoId, paths)
    },
    onSuccess: (_, paths) => {
      invalidateCache()
      paths.forEach(path => showToast.success(`Unstaged: ${path}`))
    },
    onError: (error) => handleError(error, 'Failed to unstage files')
  })

  const log = useMutation({
    mutationFn: ({ limit }: { limit?: number }) => {
      if (!repoId) throw new Error('No repo ID')
      return fetchGitLog(repoId, limit)
    },
    onError: (error) => handleError(error, 'Failed to fetch git log')
  })

  const diff = useMutation({
    mutationFn: (path: string) => {
      if (!repoId) throw new Error('No repo ID')
      return fetchGitDiff(repoId, path)
    },
    onError: (error) => handleError(error, 'Failed to fetch file diff')
  })

  const createBranchMutation = useMutation({
    mutationFn: (branchName: string) => {
      if (!repoId) throw new Error('No repo ID')
      return createBranch(repoId, branchName)
    },
    onSuccess: () => {
      invalidateCache(['branches'])
      showToast.success('Branch created')
    },
    onError: (error) => handleError(error, 'Failed to create branch')
  })

  const switchBranchMutation = useMutation({
    mutationFn: (branchName: string) => {
      if (!repoId) throw new Error('No repo ID')
      return switchBranch(repoId, branchName)
    },
    onSuccess: () => {
      invalidateCache(['branches'])
      showToast.success('Switched to branch')
    },
    onError: (error) => handleError(error, 'Failed to switch branch')
  })

  return {
    fetch,
    pull,
    push,
    commit,
    stageFiles: stageFilesMutation,
    unstageFiles: unstageFilesMutation,
    log,
    diff,
    createBranch: createBranchMutation,
    switchBranch: switchBranchMutation
  }
}
