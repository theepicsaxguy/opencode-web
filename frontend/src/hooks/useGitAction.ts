import { useCallback } from 'react'

export function useGitAction(setGitError?: (err: unknown) => void) {
  return useCallback(async (action: () => Promise<unknown>) => {
    try {
      if (setGitError) setGitError(null)
      await action()
    } catch {
      // error already handled by useGit's onError -> handleGitError
    }
  }, [setGitError])
}
