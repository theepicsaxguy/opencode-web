import { useQuery } from '@tanstack/react-query'
import { API_BASE_URL } from '@/config'
import type { GitStatusResponse, FileDiffResponse, GitCommit } from '@/types/git'

export async function fetchGitStatus(repoId: number): Promise<GitStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/status`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch git status' }))
    throw new Error(error.error || 'Failed to fetch git status')
  }
  
  return response.json()
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
    const error = await response.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || 'Failed to fetch')
  }
  
  return response.json()
}

export async function pullGit(repoId: number): Promise<GitStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/pull`, {
    method: 'POST'
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to pull' }))
    throw new Error(error.error || 'Failed to pull')
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
    const error = await response.json().catch(() => ({ error: 'Failed to commit' }))
    throw new Error(error.error || 'Failed to commit')
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
    const error = await response.json().catch(() => ({ error: 'Failed to push' }))
    throw new Error(error.error || 'Failed to push')
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
    const error = await response.json().catch(() => ({ error: 'Failed to stage files' }))
    throw new Error(error.error || 'Failed to stage files')
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
    const error = await response.json().catch(() => ({ error: 'Failed to unstage files' }))
    throw new Error(error.error || 'Failed to unstage files')
  }
  
  return response.json()
}

export async function fetchGitLog(repoId: number, limit?: number): Promise<GitCommit[]> {
  const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/git/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit })
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch git log' }))
    throw new Error(error.error || 'Failed to fetch git log')
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
