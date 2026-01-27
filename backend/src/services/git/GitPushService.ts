import { executeCommand } from '../../utils/process'
import { GitAuthService } from '../git-auth'
import { GitBranchService } from './GitBranchService'
import { isNoUpstreamError } from '../../utils/git-errors'
import type { Database } from 'bun:sqlite'
import * as db from '../../db/queries'
import path from 'path'

export class GitPushService {
  constructor(
    private gitAuthService: GitAuthService,
    private branchService: GitBranchService
  ) {}

  async push(
    repoId: number,
    options: { setUpstream?: boolean },
    database: Database
  ): Promise<string> {
    const repo = db.getRepoById(database, repoId)
    if (!repo) {
      throw new Error('Repository not found')
    }

    const fullPath = path.resolve(repo.fullPath)
    const env = this.gitAuthService.getGitEnvironment()

    // Try simple push first, then handle no-upstream errors
    try {
      const args = ['git', '-C', fullPath, 'push']
      return executeCommand(args, { env })
    } catch (error) {
      if (isNoUpstreamError(error as Error) && !options.setUpstream) {
        // Retry with --set-upstream to create remote branch
        return await this.pushWithUpstream(repoId, fullPath, env, database)
      }
      throw error
    }
  }

  private async pushWithUpstream(
    repoId: number,
    fullPath: string,
    env: Record<string, string>,
    database: Database
  ): Promise<string> {
    let branchName: string | null = null

    try {
      // Get current branch name
      const branches = await this.branchService.getBranches(repoId, database)
      const currentBranch = branches.find(b => b.current && b.type === 'local')
      branchName = currentBranch?.name || null
    } catch {
      // If branch detection fails, try to extract from error message
      // This is a fallback, ideally we want the current branch name
    }

    if (!branchName) {
      branchName = 'HEAD' // fallback
    }

    const args = ['git', '-C', fullPath, 'push', '--set-upstream', 'origin', branchName]
    return executeCommand(args, { env })
  }
}
