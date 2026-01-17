import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchGit, pullGit, pushGit, commitGit, stageFiles, unstageFiles, fetchGitLog, fetchGitDiff, createBranch, switchBranch } from '@/api/git'
import { showToast } from '@/lib/toast'
import type { UseMutationResult } from '@tanstack/react-query'

export function useGit(repoId: number | undefined) {
  const queryClient = useQueryClient()

  const fetch = useMutation({
    mutationFn: () => {
      if (!repoId) throw new Error('No repo ID')
      return fetchGit(repoId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['gitLog', repoId] })
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to fetch')
    }
  })

  const pull = useMutation({
    mutationFn: () => {
      if (!repoId) throw new Error('No repo ID')
      return pullGit(repoId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['gitLog', repoId] })
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to pull')
    }
  })

  const push = useMutation({
    mutationFn: ({ setUpstream }: { setUpstream?: boolean }) => {
      if (!repoId) throw new Error('No repo ID')
      return pushGit(repoId, setUpstream)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['gitLog', repoId] })
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to push')
    }
  })

  const commit = useMutation({
    mutationFn: ({ message, stagedPaths }: { message: string; stagedPaths?: string[] }) => {
      if (!repoId) throw new Error('No repo ID')
      return commitGit(repoId, message, stagedPaths)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['gitLog', repoId] })
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to commit')
    }
  })

  const stageFilesMutation = useMutation({
    mutationFn: (paths: string[]) => {
      if (!repoId) throw new Error('No repo ID')
      return stageFiles(repoId, paths)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['gitLog', repoId] })
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to stage files')
    }
  })

  const unstageFilesMutation = useMutation({
    mutationFn: (paths: string[]) => {
      if (!repoId) throw new Error('No repo ID')
      return unstageFiles(repoId, paths)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['gitLog', repoId] })
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to unstage files')
    }
  })

  const log = useMutation({
    mutationFn: ({ limit }: { limit?: number }) => {
      if (!repoId) throw new Error('No repo ID')
      return fetchGitLog(repoId, limit)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['gitLog', repoId] })
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to fetch git log')
    }
  })

  const diff = useMutation({
    mutationFn: (path: string) => {
      if (!repoId) throw new Error('No repo ID')
      return fetchGitDiff(repoId, path)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['gitLog', repoId] })
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to fetch git diff')
    }
  })

  const createBranchMutation = useMutation({
    mutationFn: (branchName: string) => {
      if (!repoId) throw new Error('No repo ID')
      return createBranch(repoId, branchName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['branches', repoId] })
      queryClient.invalidateQueries({ queryKey: ['gitLog', repoId] })
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to create branch')
    }
  })

  const switchBranchMutation = useMutation({
    mutationFn: (branchName: string) => {
      if (!repoId) throw new Error('No repo ID')
      return switchBranch(repoId, branchName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['branches', repoId] })
      queryClient.invalidateQueries({ queryKey: ['gitLog', repoId] })
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to switch branch')
    }
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
  } as {
    fetch: UseMutationResult
    pull: UseMutationResult
    push: UseMutationResult
    commit: UseMutationResult
    stageFiles: UseMutationResult
    unstageFiles: UseMutationResult
    log: UseMutationResult
    diff: UseMutationResult
    createBranch: UseMutationResult
    switchBranch: UseMutationResult
  }
}
