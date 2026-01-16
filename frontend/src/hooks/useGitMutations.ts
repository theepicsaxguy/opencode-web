import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchGit, pullGit, commitGit, pushGit, stageFiles, unstageFiles, fetchGitLog } from '@/api/git'

export function useGitMutations(repoId: number | undefined) {
  const queryClient = useQueryClient()

  const fetchMutation = useMutation({
    mutationFn: () => {
      if (!repoId) throw new Error('No repo ID')
      return fetchGit(repoId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['fileDiff', repoId] })
    },
  })

  const pullMutation = useMutation({
    mutationFn: () => {
      if (!repoId) throw new Error('No repo ID')
      return pullGit(repoId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['fileDiff', repoId] })
    },
  })

  const commitMutation = useMutation({
    mutationFn: ({ message, stagedPaths }: { message: string; stagedPaths?: string[] }) => {
      if (!repoId) throw new Error('No repo ID')
      return commitGit(repoId, message, stagedPaths)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['fileDiff', repoId] })
    },
  })

  const pushMutation = useMutation({
    mutationFn: ({ setUpstream }: { setUpstream?: boolean } = {}) => {
      if (!repoId) throw new Error('No repo ID')
      return pushGit(repoId, setUpstream)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['fileDiff', repoId] })
    },
  })

  const stageFilesMutation = useMutation({
    mutationFn: (paths: string[]) => {
      if (!repoId) throw new Error('No repo ID')
      return stageFiles(repoId, paths)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['fileDiff', repoId] })
    },
  })

  const unstageFilesMutation = useMutation({
    mutationFn: (paths: string[]) => {
      if (!repoId) throw new Error('No repo ID')
      return unstageFiles(repoId, paths)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitStatus', repoId] })
      queryClient.invalidateQueries({ queryKey: ['fileDiff', repoId] })
    },
  })

  const logMutation = useMutation({
    mutationFn: ({ limit }: { limit?: number } = {}) => {
      if (!repoId) throw new Error('No repo ID')
      return fetchGitLog(repoId, limit)
    },
  })

  return {
    fetch: fetchMutation,
    pull: pullMutation,
    commit: commitMutation,
    push: pushMutation,
    stageFiles: stageFilesMutation,
    unstageFiles: unstageFilesMutation,
    log: logMutation,
  }
}
