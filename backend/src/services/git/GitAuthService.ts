import { createGitEnv, createNoPromptGitEnv } from '../../utils/git-auth'
import { SettingsService } from '../settings'
import type { Database } from 'bun:sqlite'

export class GitAuthService {
  getGitEnvironment(database: Database): Record<string, string> {
    try {
      const settingsService = new SettingsService(database)
      const settings = settingsService.getSettings('default')
      const gitCredentials = settings.preferences.gitCredentials || []

      return createGitEnv(gitCredentials)
    } catch {
      return createNoPromptGitEnv()
    }
  }
}
