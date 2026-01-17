/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitFetchService } from '../../../src/services/git/GitFetchService'
import type { Database } from 'bun:sqlite'

const executeCommand = vi.fn()
const getRepoById = vi.fn()
const getGitEnvironment = vi.fn()

vi.mock('../../../src/utils/process', () => ({
  executeCommand,
}))

vi.mock('../../../src/db/queries', () => ({
  getRepoById,
}))

vi.mock('../../../src/utils/git-auth', () => ({
  GitAuthService: vi.fn().mockImplementation(() => ({
    getGitEnvironment,
  })),
}))

const mockSpawn = vi.fn()

vi.mock('child_process', () => ({
  spawn: mockSpawn,
}))

describe('GitFetchService', () => {
  let service: GitFetchService
  let database: Database

  beforeEach(() => {
    vi.clearAllMocks()
    database = {} as Database
    mockSpawn.mockClear()
    const { GitAuthService } = require('../../../src/utils/git-auth')
    const gitAuthService = new GitAuthService()
    service = new GitFetchService(gitAuthService)
    getGitEnvironment.mockReturnValue({})
  })

  describe('fetch', () => {
    it('fetches all changes from remote', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)

      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => { if (event === 'close') callback(0) }),
      }
      mockSpawn.mockReturnValue(mockProc)

      const result = await service.fetch(1, database)

      expect(getRepoById).toHaveBeenCalledWith(database, 1)
      expect(mockSpawn).toHaveBeenCalledWith('git', ['-C', mockRepo.fullPath, 'fetch', '--all', '--prune-tags'], {
        shell: false,
        env: expect.any(Object),
      })
      expect(result).toEqual({ stdout: '', stderr: '' })
    })

    it('throws error when repository not found', async () => {
      getRepoById.mockReturnValue(null)

      await expect(service.fetch(999, database)).rejects.toThrow('Repository not found')
    })

    it('throws error when fetch command fails', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)
      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn((event, callback) => { if (event === 'data') callback(Buffer.from('Fetch failed')) }) },
        on: vi.fn((event, callback) => { if (event === 'close') callback(128) }),
      }
      mockSpawn.mockReturnValue(mockProc)

      await expect(service.fetch(1, database)).rejects.toThrow('Failed to fetch changes')
    })
  })

  describe('pull', () => {
    it('pulls changes from remote', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)

      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => { if (event === 'close') callback(0) }),
      }
      mockSpawn.mockReturnValue(mockProc)

      const result = await service.pull(1, database)

      expect(getRepoById).toHaveBeenCalledWith(database, 1)
      expect(mockSpawn).toHaveBeenCalledWith('git', ['-C', mockRepo.fullPath, 'pull'], {
        shell: false,
        env: expect.any(Object),
      })
      expect(result).toEqual({ stdout: '', stderr: '' })
    })

    it('throws error when repository not found', async () => {
      getRepoById.mockReturnValue(null)

      await expect(service.pull(999, database)).rejects.toThrow('Repository not found')
    })

    it('throws error when pull command fails', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)
      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn((event, callback) => { if (event === 'data') callback(Buffer.from('Pull failed')) }) },
        on: vi.fn((event, callback) => { if (event === 'close') callback(1) }),
      }
      mockSpawn.mockReturnValue(mockProc)

      await expect(service.pull(1, database)).rejects.toThrow('Failed to pull changes')
    })
  })

  describe('hasCommits', () => {
    it('returns true when repository has commits', async () => {
      executeCommand.mockResolvedValue('abc123')

      const result = await service.hasCommits('/path/to/repo')

      expect(executeCommand).toHaveBeenCalledWith(['git', '-C', '/path/to/repo', 'rev-parse', 'HEAD'], { silent: true })
      expect(result).toBe(true)
    })

    it('returns false when repository has no commits', async () => {
      executeCommand.mockRejectedValue(new Error('fatal: not a git repository'))

      const result = await service.hasCommits('/path/to/repo')

      expect(executeCommand).toHaveBeenCalledWith(['git', '-C', '/path/to/repo', 'rev-parse', 'HEAD'], { silent: true })
      expect(result).toBe(false)
    })

    it('returns false when HEAD does not exist', async () => {
      executeCommand.mockRejectedValue(new Error('fatal: ambiguous argument'))

      const result = await service.hasCommits('/path/to/repo')

      expect(result).toBe(false)
    })
  })
})
