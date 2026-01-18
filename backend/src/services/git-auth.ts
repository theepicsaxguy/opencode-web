import { SettingsService } from './settings'
import type { Database } from 'bun:sqlite'
import { executeCommand } from '../utils/process'
import { getRepoById } from '../db/queries'
import path from 'path'
import { createSilentGitEnv, getCredentialForHost, getDefaultUsername, normalizeHost } from '../utils/git-auth'

function isWriteOperation(gitCommand: string[]): boolean {
  const writeOps = ['push']
  return gitCommand.some(arg => writeOps.includes(arg))
}

export class GitAuthService {
  async getGitEnvironment(repoId: number, database: Database, gitCommand: string[] = [], silent: boolean = false): Promise<Record<string, string>> {
    try {
      const settingsService = new SettingsService(database)
      const settings = settingsService.getSettings('default')
      const gitCredentials = settings.preferences.gitCredentials || []

      // Get repo host
      const repo = getRepoById(database, repoId)
      if (!repo) {
        return createSilentGitEnv()
      }

      const fullPath = path.resolve(repo.fullPath)
      const remoteUrl = await executeCommand(['git', '-C', fullPath, 'remote', 'get-url', 'origin'], { silent: true })
      const host = new URL(remoteUrl.trim()).hostname

      // Find matching credential
      const credential = getCredentialForHost(gitCredentials, host)
      if (!credential) {
        return createSilentGitEnv()
      }

      if (silent) {
        return createSilentGitEnv()
      }

      // Create env with askpass script
      const askpassPath = path.join(__dirname, '../../utils/git-askpass.ts')
      return {
        GIT_TERMINAL_PROMPT: '0',
        GIT_ASKPASS: `bun run ${askpassPath}`,
        SSH_ASKPASS: `bun run ${askpassPath}`,
        GIT_CONFIG_COUNT: '0'
      }
    } catch {
      return createSilentGitEnv()
    }
  }
}