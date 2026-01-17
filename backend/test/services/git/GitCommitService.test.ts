/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitCommitService } from '../../../src/services/git/GitCommitService'
import type { Database } from 'bun:sqlite'

const executeCommand = vi.fn()
const getRepoById = vi.fn()
const getGitEnvironment = vi.fn()
const mockSpawn = vi.fn()

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

vi.mock('child_process', () => ({
  spawn: mockSpawn,
}))

describe('GitCommitService', () => {
  let service: GitCommitService
  let database: Database

  beforeEach(() => {
    vi.clearAllMocks()
    database = {} as Database
    const { GitAuthService } = require('../../../src/utils/git-auth')
    const gitAuthService = new GitAuthService()
    service = new GitCommitService(gitAuthService)
    getGitEnvironment.mockReturnValue({})

    const mockProc = {
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') callback(Buffer.from(''))
        }),
      },
      stderr: {
        on: vi.fn((event, callback) => {
          if (event === 'data') callback(Buffer.from(''))
        }),
      },
      on: vi.fn((event, callback) => {
        if (event === 'close') callback(0)
      }),
    }
    mockSpawn.mockReturnValue(mockProc)
  })

  describe('commit', () => {
    it('commits staged changes with message', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)

      const result = await service.commit(1, 'Test commit', database)

      expect(getRepoById).toHaveBeenCalledWith(database, 1)
      expect(mockSpawn).toHaveBeenCalledWith('git', ['-C', mockRepo.fullPath, 'commit', '-m', 'Test commit'], {
        shell: false,
        env: expect.any(Object),
      })
      expect(result).toEqual({ stdout: '', stderr: '' })
    })

    it('commits specific staged files', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)

      const result = await service.commit(1, 'Commit specific files', database, ['file1.ts', 'file2.ts'])

      expect(mockSpawn).toHaveBeenCalledWith('git', ['-C', mockRepo.fullPath, 'commit', '-m', 'Commit specific files', '--', 'file1.ts', 'file2.ts'], {
        shell: false,
        env: expect.any(Object),
      })
      expect(result).toEqual({ stdout: '', stderr: '' })
    })

    it('throws error when repository not found', async () => {
      getRepoById.mockReturnValue(null)

      await expect(service.commit(999, 'Test', database)).rejects.toThrow('Repository not found')
    })

    it('throws error when commit command fails', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)

      const mockProc = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') callback(Buffer.from(''))
          }),
        },
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === 'data') callback(Buffer.from('Nothing to commit'))
          }),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(1)
        }),
      }
      mockSpawn.mockReturnValue(mockProc)

      await expect(service.commit(1, 'Test', database)).rejects.toThrow('Failed to commit changes')
    })
  })

  describe('stageFiles', () => {
    it('stages files', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)

      const result = await service.stageFiles(1, ['file1.ts', 'file2.ts'], database)

      expect(getRepoById).toHaveBeenCalledWith(database, 1)
      expect(mockSpawn).toHaveBeenCalledWith('git', ['-C', mockRepo.fullPath, 'add', '--', 'file1.ts', 'file2.ts'], {
        shell: false,
        env: expect.any(Object),
      })
      expect(result).toEqual({ stdout: '', stderr: '' })
    })

    it('returns early when no files to stage', async () => {
      const result = await service.stageFiles(1, [], database)

      expect(mockSpawn).not.toHaveBeenCalled()
      expect(result).toEqual({ stdout: '', stderr: '' })
    })

    it('throws error when repository not found', async () => {
      getRepoById.mockReturnValue(null)

      await expect(service.stageFiles(999, ['file.ts'], database)).rejects.toThrow('Repository not found')
    })

    it('throws error when stage command fails', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)

      const mockProc = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') callback(Buffer.from(''))
          }),
        },
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === 'data') callback(Buffer.from('Pathspec error'))
          }),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(1)
        }),
      }
      mockSpawn.mockReturnValue(mockProc)

      await expect(service.stageFiles(1, ['invalid.txt'], database)).rejects.toThrow('Failed to stage files')
    })
  })

  describe('unstageFiles', () => {
    it('unstages files', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)

      const result = await service.unstageFiles(1, ['file1.ts', 'file2.ts'], database)

      expect(getRepoById).toHaveBeenCalledWith(database, 1)
      expect(mockSpawn).toHaveBeenCalledWith('git', ['-C', mockRepo.fullPath, 'restore', '--staged', '--', 'file1.ts', 'file2.ts'], {
        shell: false,
        env: expect.any(Object),
      })
      expect(result).toEqual({ stdout: '', stderr: '' })
    })

    it('returns early when no files to unstage', async () => {
      const result = await service.unstageFiles(1, [], database)

      expect(mockSpawn).not.toHaveBeenCalled()
      expect(result).toEqual({ stdout: '', stderr: '' })
    })

    it('throws error when repository not found', async () => {
      getRepoById.mockReturnValue(null)

      await expect(service.unstageFiles(999, ['file.ts'], database)).rejects.toThrow('Repository not found')
    })

    it('throws error when unstage command fails', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)

      const mockProc = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') callback(Buffer.from(''))
          }),
        },
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === 'data') callback(Buffer.from('Error unstaging'))
          }),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(1)
        }),
      }
      mockSpawn.mockReturnValue(mockProc)

      await expect(service.unstageFiles(1, ['file.ts'], database)).rejects.toThrow('Failed to unstage files')
    })
  })

  describe('getStatus', () => {
    it('returns empty status for clean repository', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)
      executeCommand.mockImplementation((args) => {
        if (args.includes('status')) return Promise.resolve('')
        if (args.includes('rev-parse')) return Promise.resolve('main')
        return Promise.resolve('')
      })

      const result = await service.getStatus(1, database)

      expect(result.files).toEqual([])
      expect(result.hasChanges).toBe(false)
    })

    it('parses modified files correctly', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)
      executeCommand.mockImplementation((args) => {
        if (args.includes('status')) return Promise.resolve('MM file.ts')
        if (args.includes('rev-parse')) return Promise.resolve('main')
        return Promise.resolve('')
      })

      const result = await service.getStatus(1, database)

      expect(result.files).toHaveLength(2)
      expect(result.files[0]).toEqual({ path: 'file.ts', status: 'modified', staged: true })
      expect(result.files[1]).toEqual({ path: 'file.ts', status: 'modified', staged: false })
      expect(result.hasChanges).toBe(true)
    })

    it('parses staged files correctly', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)
      executeCommand.mockImplementation((args) => {
        if (args.includes('status')) return Promise.resolve('M  file1.ts\nA  file2.ts')
        if (args.includes('rev-parse')) return Promise.resolve('main')
        return Promise.resolve('')
      })

      const result = await service.getStatus(1, database)

      expect(result.files).toHaveLength(2)
      expect(result.files[0]).toEqual({ path: 'file1.ts', status: 'modified', staged: true })
      expect(result.files[1]).toEqual({ path: 'file2.ts', status: 'added', staged: true })
    })

    it('parses deleted files correctly', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)
      executeCommand.mockImplementation((args) => {
        if (args.includes('status')) return Promise.resolve('D  file1.ts\n D file2.ts')
        if (args.includes('rev-parse')) return Promise.resolve('main')
        return Promise.resolve('')
      })

      const result = await service.getStatus(1, database)

      expect(result.files).toHaveLength(2)
      expect(result.files[0]).toEqual({ path: 'file1.ts', status: 'deleted', staged: true })
      expect(result.files[1]).toEqual({ path: 'file2.ts', status: 'deleted', staged: false })
    })

    it('parses renamed files correctly', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)
      executeCommand.mockImplementation((args) => {
        if (args.includes('status')) return Promise.resolve('R  old.ts\nR  new.ts')
        if (args.includes('rev-parse')) return Promise.resolve('main')
        return Promise.resolve('')
      })

      const result = await service.getStatus(1, database)

      expect(result.files).toHaveLength(2)
      expect(result.files[0]).toEqual({ path: 'old.ts', status: 'renamed', staged: true })
      expect(result.files[1]).toEqual({ path: 'new.ts', status: 'renamed', staged: true })
    })

    it('parses untracked files correctly', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)
      executeCommand.mockImplementation((args) => {
        if (args.includes('status')) return Promise.resolve('?? newfile.ts')
        if (args.includes('rev-parse')) return Promise.resolve('main')
        return Promise.resolve('')
      })

      const result = await service.getStatus(1, database)

      expect(result.files).toHaveLength(1)
      expect(result.files[0]).toEqual({ path: 'newfile.ts', status: 'untracked', staged: false })
    })

    it('parses copied files correctly', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)
      executeCommand.mockImplementation((args) => {
        if (args.includes('status')) return Promise.resolve('C  original.ts')
        if (args.includes('rev-parse')) return Promise.resolve('main')
        return Promise.resolve('')
      })

      const result = await service.getStatus(1, database)

      expect(result.files).toHaveLength(1)
      expect(result.files[0]).toEqual({ path: 'original.ts', status: 'copied', staged: true })
    })

    it('parses mixed status output', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)
      executeCommand.mockImplementation((args) => {
        if (args.includes('status')) return Promise.resolve('MM file1.ts\nA  file2.ts\n?? file3.ts\nD  file4.ts')
        if (args.includes('rev-parse')) return Promise.resolve('main')
        return Promise.resolve('')
      })

      const result = await service.getStatus(1, database)

      expect(result.files).toHaveLength(5)
      expect(result.files).toContainEqual({ path: 'file1.ts', status: 'modified', staged: true })
      expect(result.files).toContainEqual({ path: 'file1.ts', status: 'modified', staged: false })
      expect(result.files).toContainEqual({ path: 'file2.ts', status: 'added', staged: true })
      expect(result.files).toContainEqual({ path: 'file3.ts', status: 'untracked', staged: false })
      expect(result.files).toContainEqual({ path: 'file4.ts', status: 'deleted', staged: true })
    })

    it('throws error when repository not found', async () => {
      getRepoById.mockReturnValue(null)

      await expect(service.getStatus(999, database)).rejects.toThrow('Repository not found')
    })

    it('throws error when status command fails', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)
      executeCommand.mockRejectedValue(new Error('Not a git repository'))

      await expect(service.getStatus(1, database)).rejects.toThrow('Failed to get status')
    })
  })

  describe('resetToCommit', () => {
    it('resets to specific commit', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)

      const result = await service.resetToCommit(1, 'abc123', database)

      expect(getRepoById).toHaveBeenCalledWith(database, 1)
      expect(mockSpawn).toHaveBeenCalledWith('git', ['-C', mockRepo.fullPath, 'reset', '--hard', 'abc123'], {
        shell: false,
        env: expect.any(Object),
      })
      expect(result).toEqual({ stdout: '', stderr: '' })
    })

    it('throws error when repository not found', async () => {
      getRepoById.mockReturnValue(null)

      await expect(service.resetToCommit(999, 'abc123', database)).rejects.toThrow('Repository not found')
    })

    it('throws error when reset command fails', async () => {
      const mockRepo = {
        id: 1,
        fullPath: '/path/to/repo',
      }
      getRepoById.mockReturnValue(mockRepo)

      const mockProc = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') callback(Buffer.from(''))
          }),
        },
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === 'data') callback(Buffer.from('Invalid commit hash'))
          }),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(128)
        }),
      }
      mockSpawn.mockReturnValue(mockProc)

      await expect(service.resetToCommit(1, 'invalid', database)).rejects.toThrow('Failed to reset to commit')
    })
  })
})
