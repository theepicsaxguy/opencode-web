import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { API_BASE_URL } from '@/config'
import type { GitStatusResponse, FileDiffResponse, GitCommit } from '@/types/git'

export class GitError extends Error {
  code?: string
  statusCode?: number

  constructor(message: string, code?: string, statusCode?: number) {
    super(message)
    this.name = 'GitError'
    this.code = code
    this.statusCode = statusCode
  }
}

interface ApiError {
  error: string
  code?: string
}

async function handleApiError(response: Response): Promise<never> {
  const data: ApiError = await response.json().catch(() => ({ error: 'An error occurred' }))
  throw new GitError(data.error, data.code, response.status)
}

const GitLogEntry = z.object({
  hash: z.string(),
  authorName: z.string(),
  authorEmail: z.string(),
  date: z.string(),
  message: z.string()
})

const GitLogResponse = z.array(GitLogEntry)

const GitDiffResponse = z.object({
  diff: z.string()
})

export async function fetchGitStatus(repoId: number): Promise<GitStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/status`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch git status' }))
    throw new Error(error.error || 'Failed to fetch git status')
  }
  
  return response.json()
}

export async function fetchReposGitStatus(repoIds: number[]): Promise<Map<number, GitStatusResponse>> {
  const response = await fetch(`${API_BASE_URL}/api/repos/git-status-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoIds })
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch batch git status' }))
    throw new Error(error.error || 'Failed to fetch batch git status')
  }
  
  const data = await response.json()
  return new Map(Object.entries(data).map(([id, status]) => [Number(id), status as GitStatusResponse]))
}

export async function fetchFileDiff(repoId: number, path: string): Promise<FileDiffResponse> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/diff?path=${encodeURIComponent(path)}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch file diff' }))
    throw new Error(error.error || 'Failed to fetch file diff')
  }
  
  return response.json()
}

export async function fetchGit(repoId: number): Promise<GitStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/fetch`, {
    method: 'POST'
  })
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  return response.json()
}

export async function pullGit(repoId: number): Promise<GitStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/pull`, {
    method: 'POST'
  })
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  return response.json()
}

export async function commitGit(repoId: number, message: string, stagedPaths?: string[]): Promise<GitStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, stagedPaths })
  })
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  return response.json()
}

export async function pushGit(repoId: number, setUpstream?: boolean): Promise<GitStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setUpstream })
  })
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  return response.json()
}

export async function stageFiles(repoId: number, paths: string[]): Promise<GitStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/stage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths })
  })
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  return response.json()
}

export async function unstageFiles(repoId: number, paths: string[]): Promise<GitStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/unstage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths })
  })
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  return response.json()
}

export async function fetchGitDiff(repoId: number, path: string): Promise<{ diff: string }> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/diff-full?path=${encodeURIComponent(path)}`)
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  const data = await response.json()
  return GitDiffResponse.parse(data)
}

export async function fetchGitLog(repoId: number, limit?: number): Promise<GitCommit[]> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit })
  })
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  const data = await response.json()
  return GitLogResponse.parse(data)
}

export async function fetchBranches(repoId: number): Promise<{ branches: string[]; status: { ahead: number; behind: number } }> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/branches`)
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  return response.json()
}

export async function createBranch(repoId: number, branchName: string): Promise<{ stdout: string; stderr: string }> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/branch/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branch: branchName })
  })
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  return response.json()
}

export async function switchBranch(repoId: number, branchName: string): Promise<{ stdout: string; stderr: string }> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/branch/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branch: branchName })
  })
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  return response.json()
}

export function useGitStatus(repoId: number | undefined) {
  return useQuery({
    queryKey: ['gitStatus', repoId],
    queryFn: () => repoId ? fetchGitStatus(repoId) : Promise.reject(new Error('No repo ID')),
    enabled: !!repoId,
    refetchInterval: 10000,
  })
}

export function useFileDiff(repoId: number | undefined, path: string | undefined) {
  return useQuery({
    queryKey: ['fileDiff', repoId, path],
    queryFn: () => (repoId && path) ? fetchFileDiff(repoId, path) : Promise.reject(new Error('Missing params')),
    enabled: !!repoId && !!path,
  })
}

export function useGitLog(repoId: number | undefined, limit: number = 5) {
  return useQuery({
    queryKey: ['gitLog', repoId, limit],
    queryFn: () => repoId ? fetchGitLog(repoId, limit) : Promise.reject(new Error('No repo ID')),
    enabled: !!repoId,
    staleTime: 60000,
  })
}

export function useBranches(repoId: number | undefined) {
  return useQuery({
    queryKey: ['branches', repoId],
    queryFn: () => repoId ? fetchBranches(repoId) : Promise.reject(new Error('No repo ID')),
    enabled: !!repoId,
    staleTime: 30000,
  })
}
