import { GitAuthService } from '../git-auth-service'
import { logger } from '../../utils/logger'
import { getErrorMessage } from '../../utils/error-utils'
import * as db from '../../db/queries'
import type { Database } from 'bun:sqlite'
import { executeCommand } from '../../utils/process'

export class GitCommitService {
  constructor(private gitAuthService: GitAuthService) {}

  async commit(repoId: number, message: string, database: Database, stagedPaths?: string[]): Promise<string> {
    try {
      const repo = db.getRepoById(database, repoId)
      if (!repo) {
        throw new Error(`Repository not found`)
      }

      const repoPath = repo.fullPath
      const env = await this.gitAuthService.getGitEnvironment(repoId, database)

      const args = ['git', '-C', repoPath, 'commit', '-m', message]

      if (stagedPaths && stagedPaths.length > 0) {
        args.push('--')
        args.push(...stagedPaths)
      }

      const result = await executeCommand(args, { env })

      return result
    } catch (error: unknown) {
      logger.error(`Failed to commit changes for repo ${repoId}:`, error)
      throw error
    }
  }

  async stageFiles(repoId: number, paths: string[], database: Database): Promise<string> {
    try {
      const repo = db.getRepoById(database, repoId)
      if (!repo) {
        throw new Error(`Repository not found`)
      }

      const repoPath = repo.fullPath
      const env = await this.gitAuthService.getGitEnvironment(repoId, database)

      if (paths.length === 0) {
        return ''
      }

      const args = ['git', '-C', repoPath, 'add', '--', ...paths]
      const result = await executeCommand(args, { env })

      return result
    } catch (error: unknown) {
      logger.error(`Failed to stage files for repo ${repoId}:`, error)
      throw error
    }
  }

  async unstageFiles(repoId: number, paths: string[], database: Database): Promise<string> {
    try {
      const repo = db.getRepoById(database, repoId)
      if (!repo) {
        throw new Error(`Repository not found`)
      }

      const repoPath = repo.fullPath
      const env = await this.gitAuthService.getGitEnvironment(repoId, database)

      if (paths.length === 0) {
        return ''
      }

      const args = ['git', '-C', repoPath, 'restore', '--staged', '--', ...paths]
      const result = await executeCommand(args, { env })

      return result
    } catch (error: unknown) {
      logger.error(`Failed to unstage files for repo ${repoId}:`, error)
      throw error
    }
  }



  async resetToCommit(repoId: number, commitHash: string, database: Database): Promise<string> {
    try {
      const repo = db.getRepoById(database, repoId)
      if (!repo) {
        throw new Error(`Repository not found`)
      }

      const repoPath = repo.fullPath
      const env = await this.gitAuthService.getGitEnvironment(repoId, database)

      const args = ['git', '-C', repoPath, 'reset', '--hard', commitHash]
      const result = await executeCommand(args, { env })

      return result
    } catch (error: unknown) {
      logger.error(`Failed to reset to commit ${commitHash} for repo ${repoId}:`, error)
      throw error
    }
  }
}
