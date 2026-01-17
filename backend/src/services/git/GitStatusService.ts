import { GitAuthService } from './GitAuthService'
import { executeCommand } from '../../utils/process'
import { logger } from '../../utils/logger'
import { getErrorMessage } from '../../utils/error-utils'
import * as db from '../../db/queries'
import type { Database } from 'bun:sqlite'
import type { GitFileStatus, GitStatusResponse } from '../../types/git'
import { GitAuthenticationError, GitNotFoundError, GitOperationError } from '../../errors/git-errors'

export class GitStatusService {
  constructor(private gitAuthService: GitAuthService) {}

  async getStatus(repoId: number, database: Database): Promise<GitStatusResponse> {
    try {
      const repo = db.getRepoById(database, repoId)
      if (!repo) {
        throw new GitNotFoundError(`Repository not found`)
      }

      const repoPath = repo.fullPath
      const env = this.gitAuthService.getGitEnvironment(database)

      const [branch, branchStatus, porcelainOutput] = await Promise.all([
        this.getCurrentBranch(repoPath, env),
        this.getBranchStatus(repoPath, env),
        executeCommand(['git', '-C', repoPath, 'status', '--porcelain'], { env })
      ])

      const files = this.parsePorcelainOutput(porcelainOutput)
      const hasChanges = files.length > 0

      return {
        branch,
        ahead: branchStatus.ahead,
        behind: branchStatus.behind,
        files,
        hasChanges
      }
    } catch (error: unknown) {
      if (error instanceof GitNotFoundError || error instanceof GitAuthenticationError || error instanceof GitOperationError) {
        throw error
      }
      const errorMessage = getErrorMessage(error)
      logger.error(`Failed to get status for repo ${repoId}:`, error)
      if (this.isAuthenticationError(errorMessage)) {
        throw new GitAuthenticationError('Authentication failed. Check your Git credentials in Settings.')
      }
      throw new GitOperationError(`Failed to get status: ${errorMessage}`)
    }
  }

  private async getCurrentBranch(repoPath: string, env: Record<string, string> | undefined): Promise<string> {
    try {
      const branch = await executeCommand(['git', '-C', repoPath, 'rev-parse', '--abbrev-ref', 'HEAD'], { env, silent: true })
      return branch.trim()
    } catch {
      return ''
    }
  }

  private async getBranchStatus(repoPath: string, env: Record<string, string> | undefined): Promise<{ ahead: number; behind: number }> {
    try {
      const stdout = await executeCommand(['git', '-C', repoPath, 'rev-list', '--left-right', '--count', 'HEAD...@{upstream}'], { env, silent: true })
      const [behind, ahead] = stdout.trim().split(/\s+/).map(Number)

      return { ahead: ahead || 0, behind: behind || 0 }
    } catch {
      return { ahead: 0, behind: 0 }
    }
  }

  private parsePorcelainOutput(output: string): GitFileStatus[] {
    const files: GitFileStatus[] = []
    const lines = output.trim().split('\n').filter(line => line.trim())

    for (const line of lines) {
      if (line.length < 3) continue

      const stagedStatus = line[0] as string
      const unstagedStatus = line[1] as string
      const filePath = line.substring(3)

      if (stagedStatus !== ' ' && stagedStatus !== '?') {
        files.push({
          path: filePath,
          status: this.parseStatusCode(stagedStatus),
          staged: true
        })
      }

      if (unstagedStatus !== ' ' && unstagedStatus !== '?') {
        files.push({
          path: filePath,
          status: this.parseStatusCode(unstagedStatus),
          staged: false
        })
      }

      if (stagedStatus === '?' || unstagedStatus === '?') {
        files.push({
          path: filePath,
          status: 'untracked',
          staged: false
        })
      }
    }

    return files
  }

  private parseStatusCode(code: string): 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'copied' {
    switch (code) {
      case 'M':
        return 'modified'
      case 'A':
        return 'added'
      case 'D':
        return 'deleted'
      case 'R':
        return 'renamed'
      case 'C':
        return 'copied'
      case '?':
        return 'untracked'
      default:
        return 'modified'
    }
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