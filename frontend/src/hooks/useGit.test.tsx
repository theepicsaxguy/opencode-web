import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGit } from './useGit'
import * as gitApi from '../api/git'
import * as toast from '../lib/toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../api/git')
vi.mock('../lib/toast')

const mockInvalidateQueries = vi.fn()

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({
      invalidateQueries: mockInvalidateQueries
    }))
  }
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useGit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvalidateQueries.mockClear()
  })

  it('returns all mutations', () => {
    const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

    expect(result.current).toHaveProperty('fetch')
    expect(result.current).toHaveProperty('pull')
    expect(result.current).toHaveProperty('push')
    expect(result.current).toHaveProperty('commit')
    expect(result.current).toHaveProperty('stageFiles')
    expect(result.current).toHaveProperty('unstageFiles')
    expect(result.current).toHaveProperty('log')
    expect(result.current).toHaveProperty('diff')
  })

  describe('fetch mutation', () => {
    it('calls correct API and invalidates queries on success', async () => {
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.fetch.mutateAsync()
      })

      expect(gitApi.fetchGit).toHaveBeenCalledWith(1)
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitStatus', 1] })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitLog', 1] })
    })

    it('shows toast error on failure', async () => {
      vi.mocked(gitApi.fetchGit).mockRejectedValue(new Error('Fetch failed'))
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.fetch.mutateAsync().catch(() => {})
      })

      expect(toast.showToast.error).toHaveBeenCalledWith('Fetch failed')
    })
  })

  describe('pull mutation', () => {
    it('calls correct API and invalidates queries on success', async () => {
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.pull.mutateAsync()
      })

      expect(gitApi.pullGit).toHaveBeenCalledWith(1)
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitStatus', 1] })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitLog', 1] })
    })

    it('shows toast error on failure', async () => {
      vi.mocked(gitApi.pullGit).mockRejectedValue(new Error('Pull failed'))
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.pull.mutateAsync().catch(() => {})
      })

      expect(toast.showToast.error).toHaveBeenCalledWith('Pull failed')
    })
  })

  describe('push mutation', () => {
    it('calls correct API with setUpstream option', async () => {
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.push.mutateAsync({ setUpstream: true })
      })

      expect(gitApi.pushGit).toHaveBeenCalledWith(1, true)
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitStatus', 1] })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitLog', 1] })
    })

    it('calls correct API without setUpstream option', async () => {
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.push.mutateAsync({})
      })

      expect(gitApi.pushGit).toHaveBeenCalledWith(1, undefined)
    })

    it('shows toast error on failure', async () => {
      vi.mocked(gitApi.pushGit).mockRejectedValue(new Error('Push failed'))
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.push.mutateAsync({}).catch(() => {})
      })

      expect(toast.showToast.error).toHaveBeenCalledWith('Push failed')
    })
  })

  describe('commit mutation', () => {
    it('calls correct API with message and stagedPaths', async () => {
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.commit.mutateAsync({ message: 'Test commit', stagedPaths: ['file1.ts', 'file2.ts'] })
      })

      expect(gitApi.commitGit).toHaveBeenCalledWith(1, 'Test commit', ['file1.ts', 'file2.ts'])
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitStatus', 1] })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitLog', 1] })
    })

    it('calls correct API with only message', async () => {
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.commit.mutateAsync({ message: 'Test commit' })
      })

      expect(gitApi.commitGit).toHaveBeenCalledWith(1, 'Test commit', undefined)
    })

    it('shows toast error on failure', async () => {
      vi.mocked(gitApi.commitGit).mockRejectedValue(new Error('Commit failed'))
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.commit.mutateAsync({ message: 'Test' }).catch(() => {})
      })

      expect(toast.showToast.error).toHaveBeenCalledWith('Commit failed')
    })
  })

  describe('stageFiles mutation', () => {
    it('calls correct API with paths', async () => {
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.stageFiles.mutateAsync(['file1.ts', 'file2.ts'])
      })

      expect(gitApi.stageFiles).toHaveBeenCalledWith(1, ['file1.ts', 'file2.ts'])
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitStatus', 1] })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitLog', 1] })
    })

    it('shows toast error on failure', async () => {
      vi.mocked(gitApi.stageFiles).mockRejectedValue(new Error('Stage failed'))
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.stageFiles.mutateAsync(['file.ts']).catch(() => {})
      })

      expect(toast.showToast.error).toHaveBeenCalledWith('Stage failed')
    })
  })

  describe('unstageFiles mutation', () => {
    it('calls correct API with paths', async () => {
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.unstageFiles.mutateAsync(['file1.ts', 'file2.ts'])
      })

      expect(gitApi.unstageFiles).toHaveBeenCalledWith(1, ['file1.ts', 'file2.ts'])
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitStatus', 1] })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['gitLog', 1] })
    })

    it('shows toast error on failure', async () => {
      vi.mocked(gitApi.unstageFiles).mockRejectedValue(new Error('Unstage failed'))
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.unstageFiles.mutateAsync(['file.ts']).catch(() => {})
      })

      expect(toast.showToast.error).toHaveBeenCalledWith('Unstage failed')
    })
  })

  describe('log mutation', () => {
    it('calls correct API with limit', async () => {
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.log.mutateAsync({ limit: 10 })
      })

      expect(gitApi.fetchGitLog).toHaveBeenCalledWith(1, 10)
    })

    it('calls correct API without limit', async () => {
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.log.mutateAsync({})
      })

      expect(gitApi.fetchGitLog).toHaveBeenCalledWith(1, undefined)
    })

    it('shows toast error on failure', async () => {
      vi.mocked(gitApi.fetchGitLog).mockRejectedValue(new Error('Log failed'))
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.log.mutateAsync({}).catch(() => {})
      })

      expect(toast.showToast.error).toHaveBeenCalledWith('Log failed')
    })
  })

  describe('diff mutation', () => {
    it('calls correct API with path', async () => {
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.diff.mutateAsync('src/file.ts')
      })

      expect(gitApi.fetchGitDiff).toHaveBeenCalledWith(1, 'src/file.ts')
    })

    it('shows toast error on failure', async () => {
      vi.mocked(gitApi.fetchGitDiff).mockRejectedValue(new Error('Diff failed'))
      const { result } = renderHook(() => useGit(1), { wrapper: createWrapper() })

      await waitFor(() => {
        result.current.diff.mutateAsync('file.ts').catch(() => {})
      })

      expect(toast.showToast.error).toHaveBeenCalledWith('Diff failed')
    })
  })
})
