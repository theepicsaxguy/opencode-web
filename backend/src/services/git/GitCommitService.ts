import { GitAuthService } from './GitAuthService'
import { logger } from '../../utils/logger'
import { getErrorMessage } from '../../utils/error-utils'
import * as db from '../../db/queries'
import type { Database } from 'bun:sqlite'

import { spawn } from 'child_process'
import { GitAuthenticationError, GitNotFoundError, GitOperationError } from '../../errors/git-errors'

export class GitCommitService {
  constructor(private gitAuthService: GitAuthService) {}

  async commit(repoId: number, message: string, database: Database, stagedPaths?: string[]): Promise<{ stdout: string; stderr: string }> {
    try {
      const repo = db.getRepoById(database, repoId)
      if (!repo) {
        throw new GitNotFoundError(`Repository not found`)
      }

      const repoPath = repo.fullPath
      const env = this.gitAuthService.getGitEnvironment(database)

      const args = ['git', '-C', repoPath, 'commit', '-m', message]

      if (stagedPaths && stagedPaths.length > 0) {
        args.push('--')
        args.push(...stagedPaths)
      }

      const result = await this.executeCommandWithStderr(args, { env })

      return result
    } catch (error: unknown) {
      if (error instanceof GitNotFoundError || error instanceof GitAuthenticationError || error instanceof GitOperationError) {
        throw error
      }
      const errorMessage = getErrorMessage(error)
      logger.error(`Failed to commit changes for repo ${repoId}:`, error)
      if (this.isAuthenticationError(errorMessage)) {
        throw new GitAuthenticationError('Authentication failed. Check your Git credentials in Settings.')
      }
      throw new GitOperationError(`Failed to commit changes: ${errorMessage}`)
    }
  }

  async stageFiles(repoId: number, paths: string[], database: Database): Promise<{ stdout: string; stderr: string }> {
    try {
      const repo = db.getRepoById(database, repoId)
      if (!repo) {
        throw new GitNotFoundError(`Repository not found`)
      }

      const repoPath = repo.fullPath
      const env = this.gitAuthService.getGitEnvironment(database)

      if (paths.length === 0) {
        return { stdout: '', stderr: '' }
      }

      const args = ['git', '-C', repoPath, 'add', '--', ...paths]
      const result = await this.executeCommandWithStderr(args, { env })

      return result
    } catch (error: unknown) {
      if (error instanceof GitNotFoundError || error instanceof GitAuthenticationError || error instanceof GitOperationError) {
        throw error
      }
      const errorMessage = getErrorMessage(error)
      logger.error(`Failed to stage files for repo ${repoId}:`, error)
      if (this.isAuthenticationError(errorMessage)) {
        throw new GitAuthenticationError('Authentication failed. Check your Git credentials in Settings.')
      }
      throw new GitOperationError(`Failed to stage files: ${errorMessage}`)
    }
  }

  async unstageFiles(repoId: number, paths: string[], database: Database): Promise<{ stdout: string; stderr: string }> {
    try {
      const repo = db.getRepoById(database, repoId)
      if (!repo) {
        throw new GitNotFoundError(`Repository not found`)
      }

      const repoPath = repo.fullPath
      const env = this.gitAuthService.getGitEnvironment(database)

      if (paths.length === 0) {
        return { stdout: '', stderr: '' }
      }

      const args = ['git', '-C', repoPath, 'restore', '--staged', '--', ...paths]
      const result = await this.executeCommandWithStderr(args, { env })

      return result
    } catch (error: unknown) {
      if (error instanceof GitNotFoundError || error instanceof GitAuthenticationError || error instanceof GitOperationError) {
        throw error
      }
      const errorMessage = getErrorMessage(error)
      logger.error(`Failed to unstage files for repo ${repoId}:`, error)
      if (this.isAuthenticationError(errorMessage)) {
        throw new GitAuthenticationError('Authentication failed. Check your Git credentials in Settings.')
      }
      throw new GitOperationError(`Failed to unstage files: ${errorMessage}`)
    }
  }



  async resetToCommit(repoId: number, commitHash: string, database: Database): Promise<{ stdout: string; stderr: string }> {
    try {
      const repo = db.getRepoById(database, repoId)
      if (!repo) {
        throw new GitNotFoundError(`Repository not found`)
      }

      const repoPath = repo.fullPath
      const env = this.gitAuthService.getGitEnvironment(database)

      const args = ['git', '-C', repoPath, 'reset', '--hard', commitHash]
      const result = await this.executeCommandWithStderr(args, { env })

      return result
    } catch (error: unknown) {
      if (error instanceof GitNotFoundError || error instanceof GitAuthenticationError || error instanceof GitOperationError) {
        throw error
      }
      const errorMessage = getErrorMessage(error)
      logger.error(`Failed to reset to commit ${commitHash} for repo ${repoId}:`, error)
      if (this.isAuthenticationError(errorMessage)) {
        throw new GitAuthenticationError('Authentication failed. Check your Git credentials in Settings.')
      }
      throw new GitOperationError(`Failed to reset to commit: ${errorMessage}`)
    }
  }



  private async executeCommandWithStderr(
    args: string[],
    options: { env?: Record<string, string>; silent?: boolean } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const [command, ...cmdArgs] = args

      const proc = spawn(command || '', cmdArgs, {
        shell: false,
        env: { ...process.env, ...options.env }
      })

      let stdout = ''
      let stderr = ''

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on('error', (error: Error) => {
        reject(error)
      })

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ stdout, stderr })
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`))
        }
      })
    })
  }

  private isAuthenticationError(message: string): boolean {
    const lowerMessage = message.toLowerCase()
    return lowerMessage.includes('authentication failed') ||
           lowerMessage.includes('invalid username or password') ||
           lowerMessage.includes('invalid credentials') ||
           lowerMessage.includes('could not read username') ||
           lowerMessage.includes('permission denied') ||
           lowerMessage.includes('fatal: authentication') ||
           lowerMessage.includes('remote: permission denied')
  }
}
