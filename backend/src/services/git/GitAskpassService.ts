import { SettingsService } from '../../services/settings'
import type { Database } from 'bun:sqlite'
import { getCredentialForHost, getDefaultUsername } from '../../utils/git-auth'
import path from 'path'

interface CachedCredential {
  username?: string
  password?: string
  token?: string
  passphrase?: string
  timestamp: number
}

export class GitAskpassService {
  private cache = new Map<string, CachedCredential>()
  private readonly cacheTtl = 60000 // 60s

  async getCredential(prompt: string, cwd: string, hostname: string, database: Database): Promise<{ username?: string; password?: string; token?: string; passphrase?: string }> {
    // Check cache first
    const cached = this.cache.get(hostname)
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached
    }

    // Find repo from cwd
    const repo = await this.findRepoByCwd(cwd, database)
    if (!repo) {
      return {}
    }

    // Get credentials
    const settingsService = new SettingsService(database)
    const settings = settingsService.getSettings('default')
    const gitCredentials = settings.preferences.gitCredentials || []

    const credential = getCredentialForHost(gitCredentials, hostname)
    if (!credential || !credential.host) {
      return {}
    }

    const username = credential.username || getDefaultUsername(credential.host)
    const result: CachedCredential = {
      username,
      token: credential.token,
      timestamp: Date.now()
    }

    // Cache the result
    this.cache.set(hostname, result)

    return result
  }

  private findRepoByCwd(cwd: string, database: Database) {
    const repos = database.query('SELECT * FROM repos').all() as any[]
    for (const repo of repos) {
      if (path.resolve(repo.fullPath) === path.resolve(cwd)) {
        return repo
      }
    }
    return null
  }
}