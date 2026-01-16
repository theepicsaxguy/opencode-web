import { executeCommand } from '../utils/process'
import { logger } from '../utils/logger'
import { getErrorMessage } from '../utils/error-utils'
import { SettingsService } from './settings'
import type { Database } from 'bun:sqlite'
import path from 'path'
import fs from 'fs/promises'
import { createGitEnv, createNoPromptGitEnv, createGitIdentityEnv, resolveGitIdentity, type GitIdentity } from '../utils/git-auth'

async function hasCommits(repoPath: string): Promise<boolean> {
  try {
    await executeCommand(['git', '-C', repoPath, 'rev-parse', 'HEAD'], { silent: true })
    return true
  } catch {
    return false
  }
}

function getGitEnvironment(database: Database): Record<string, string> {
  try {
    const settingsService = new SettingsService(database)
    const settings = settingsService.getSettings('default')
    const gitCredentials = settings.preferences.gitCredentials || []

    return createGitEnv(gitCredentials)
  } catch (error) {
    logger.warn('Failed to get git credentials from settings:', error)
    return createNoPromptGitEnv()
  }
}

async function getGitIdentity(database: Database): Promise<GitIdentity | null> {
  try {
    const settingsService = new SettingsService(database)
    const settings = settingsService.getSettings('default')
    const manualIdentity = settings.preferences.gitIdentity
    const gitCredentials = settings.preferences.gitCredentials || []

    return await resolveGitIdentity(manualIdentity, gitCredentials)
  } catch (error) {
    logger.warn('Failed to get git identity from settings:', error)
    return null
  }
}

export type GitFileStatusType = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'copied'

export interface GitFileStatus {
  path: string
  status: GitFileStatusType
  staged: boolean
  oldPath?: string
}

export interface GitStatusResponse {
  branch: string
  ahead: number
  behind: number
  files: GitFileStatus[]
  hasChanges: boolean
}

export interface FileDiffResponse {
  path: string
  status: GitFileStatusType
  diff: string | null
  additions: number
  deletions: number
  isBinary: boolean
}

export interface GitCommit {
  hash: string
  authorName: string
  authorEmail: string
  date: string
  message: string
}

function parseStatusCode(code: string): GitFileStatusType {
  switch (code) {
    case 'M': return 'modified'
    case 'A': return 'added'
    case 'D': return 'deleted'
    case 'R': return 'renamed'
    case 'C': return 'copied'
    case '?': return 'untracked'
    default: return 'modified'
  }
}

function parsePorcelainV2(output: string): { branch: string; ahead: number; behind: number; files: GitFileStatus[] } {
  const lines = output.split('\n').filter(line => line.trim())
  let branch = 'HEAD'
  let ahead = 0
  let behind = 0
  const files: GitFileStatus[] = []

  for (const line of lines) {
    if (line.startsWith('# branch.head ')) {
      branch = line.replace('# branch.head ', '')
    } else if (line.startsWith('# branch.ab ')) {
      const match = line.match(/# branch\.ab \+(\d+) -(\d+)/)
      if (match && match[1] && match[2]) {
        ahead = parseInt(match[1], 10)
        behind = parseInt(match[2], 10)
      }
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const parts = line.split(' ')
      const xy = parts[1]
      if (!xy || xy.length < 2) continue
      const stagedStatus = xy[0] as string
      const unstagedStatus = xy[1] as string

      if (line.startsWith('2 ')) {
        const pathParts = parts.slice(8).join(' ').split('\t')
        const filePath = pathParts[1] || pathParts[0] || ''
        const oldPath = pathParts[0] || ''

        if (stagedStatus !== '.') {
          files.push({
            path: filePath,
            status: parseStatusCode(stagedStatus),
            staged: true,
            oldPath: stagedStatus === 'R' || stagedStatus === 'C' ? oldPath : undefined
          })
        }
        if (unstagedStatus !== '.') {
          files.push({
            path: filePath,
            status: parseStatusCode(unstagedStatus),
            staged: false
          })
        }
      } else {
        const filePath = parts.slice(8).join(' ') || ''

        if (stagedStatus !== '.') {
          files.push({
            path: filePath,
            status: parseStatusCode(stagedStatus),
            staged: true
          })
        }
        if (unstagedStatus !== '.') {
          files.push({
            path: filePath,
            status: parseStatusCode(unstagedStatus),
            staged: false
          })
        }
      }
    } else if (line.startsWith('? ')) {
      const filePath = line.substring(2)
      files.push({
        path: filePath,
        status: 'untracked',
        staged: false
      })
    }
  }

  return { branch, ahead, behind, files }
}

async function expandUntrackedDirectory(repoPath: string, dirPath: string): Promise<GitFileStatus[]> {
  const cleanDirPath = dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath
  const fullDirPath = path.join(repoPath, cleanDirPath)
  const files: GitFileStatus[] = []
  
  async function walkDir(currentPath: string, relativePath: string): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true })
      for (const entry of entries) {
        const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name
        const entryFullPath = path.join(currentPath, entry.name)
        
        if (entry.isDirectory()) {
          await walkDir(entryFullPath, entryRelPath)
        } else {
          files.push({
            path: `${cleanDirPath}/${entryRelPath}`,
            status: 'untracked',
            staged: false
          })
        }
      }
    } catch {
      // Ignore errors reading directory
    }
  }
  
  await walkDir(fullDirPath, '')
  return files
}

export async function getGitStatus(repoPath: string, database?: Database): Promise<GitStatusResponse> {
  try {
    const fullPath = path.resolve(repoPath)
    const env = database ? getGitEnvironment(database) : undefined
    const output = await executeCommand(['git', '-C', fullPath, 'status', '--porcelain=v2', '--branch'], { env })
    const { branch, ahead, behind, files } = parsePorcelainV2(output)

    const expandedFiles: GitFileStatus[] = []
    for (const file of files) {
      if (file.status === 'untracked' && file.path.endsWith('/')) {
        const dirFiles = await expandUntrackedDirectory(fullPath, file.path)
        if (dirFiles.length > 0) {
          expandedFiles.push(...dirFiles)
        } else {
          expandedFiles.push(file)
        }
      } else {
        expandedFiles.push(file)
      }
    }

    return {
      branch,
      ahead,
      behind,
      files: expandedFiles,
      hasChanges: expandedFiles.length > 0
    }
  } catch (error: unknown) {
    logger.error(`Failed to get git status for ${repoPath}:`, error)
    throw new Error(`Failed to get git status: ${getErrorMessage(error)}`)
  }
}

export async function getFileDiff(repoPath: string, filePath: string, database?: Database): Promise<FileDiffResponse> {
  try {
    const fullRepoPath = path.resolve(repoPath)
    const status = await getGitStatus(repoPath, database)
    const fileStatus = status.files.find(f => f.path === filePath)

    if (!fileStatus) {
      return {
        path: filePath,
        status: 'modified',
        diff: null,
        additions: 0,
        deletions: 0,
        isBinary: false
      }
    }

    let diff: string | null = null
    let additions = 0
    let deletions = 0
    let isBinary = false

    const env = database ? getGitEnvironment(database) : undefined
    
    if (fileStatus.status === 'untracked') {
      try {
        const content = await executeCommand(['git', '-C', fullRepoPath, 'diff', '--no-index', '--', '/dev/null', filePath], { env, silent: true })
        diff = content
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error)
        if (errorMessage?.includes('exit code 1') || errorMessage?.includes('Command failed with code 1')) {
          const output = errorMessage || ''
          const diffMatch = output.match(/diff --git[\s\S]*(?=\n\n No newline|$)/)
          diff = diffMatch ? diffMatch[0] : output.substring(output.indexOf('diff --git'))
        } else {
          diff = `New file: ${filePath}`
        }
      }
    } else {
      try {
        const repoHasCommits = await hasCommits(fullRepoPath)
        if (repoHasCommits) {
          diff = await executeCommand(['git', '-C', fullRepoPath, 'diff', 'HEAD', '--', filePath], { env })
        } else {
          diff = `New file (no commits yet): ${filePath}`
        }
      } catch (error: unknown) {
        logger.warn(`Failed to get diff for ${filePath}:`, getErrorMessage(error))
        diff = null
      }
    }

    if (diff) {
      if (diff.includes('Binary files') || diff.includes('GIT binary patch')) {
        isBinary = true
      } else {
        const lines = diff.split('\n')
        for (const line of lines) {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            additions++
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            deletions++
          }
        }
      }
    }

    return {
      path: filePath,
      status: fileStatus.status,
      diff,
      additions,
      deletions,
      isBinary
    }
  } catch (error: unknown) {
    logger.error(`Failed to get file diff for ${filePath}:`, error)
    throw new Error(`Failed to get file diff: ${getErrorMessage(error)}`)
  }
}

export async function fetchGit(repoPath: string, database?: Database): Promise<void> {
  try {
    const fullPath = path.resolve(repoPath)
    const env = database ? getGitEnvironment(database) : undefined

    await executeCommand(['git', '-C', fullPath, 'fetch', '--all'], { env })

    logger.info(`Successfully fetched changes for ${repoPath}`)
  } catch (error: unknown) {
    logger.error(`Failed to fetch changes for ${repoPath}:`, error)
    throw new Error(`Failed to fetch changes: ${getErrorMessage(error)}`)
  }
}

export async function pullGit(repoPath: string, database?: Database): Promise<void> {
  try {
    const fullPath = path.resolve(repoPath)
    const env = database ? getGitEnvironment(database) : undefined

    await executeCommand(['git', '-C', fullPath, 'pull'], { env })

    logger.info(`Successfully pulled changes for ${repoPath}`)
  } catch (error: unknown) {
    logger.error(`Failed to pull changes for ${repoPath}:`, error)
    throw new Error(`Failed to pull changes: ${getErrorMessage(error)}`)
  }
}

export async function commitGit(repoPath: string, message: string, stagedPaths?: string[], database?: Database): Promise<void> {
  try {
    const fullPath = path.resolve(repoPath)
    const env = database ? getGitEnvironment(database) : undefined

    const args = ['git', '-C', fullPath, 'commit', '-m', message]

    if (stagedPaths && stagedPaths.length > 0) {
      args.push('--')
      args.push(...stagedPaths)
    }

    const identityEnv = database ? await getGitIdentity(database) : null
    const finalEnv = identityEnv ? { ...env, ...createGitIdentityEnv(identityEnv) } : env

    await executeCommand(args, { env: finalEnv })

    logger.info(`Successfully committed changes for ${repoPath}: ${message}`)
  } catch (error: unknown) {
    logger.error(`Failed to commit changes for ${repoPath}:`, error)
    throw new Error(`Failed to commit changes: ${getErrorMessage(error)}`)
  }
}

export async function pushGit(repoPath: string, setUpstream: boolean, database?: Database): Promise<void> {
  try {
    const fullPath = path.resolve(repoPath)
    const env = database ? getGitEnvironment(database) : undefined

    const args = ['git', '-C', fullPath, 'push']

    if (setUpstream) {
      args.push('--set-upstream')
      args.push('origin')
      args.push('HEAD')
    }

    await executeCommand(args, { env })

    logger.info(`Successfully pushed changes for ${repoPath}`)
  } catch (error: unknown) {
    logger.error(`Failed to push changes for ${repoPath}:`, error)
    throw new Error(`Failed to push changes: ${getErrorMessage(error)}`)
  }
}

export async function stageFiles(repoPath: string, paths: string[], database?: Database): Promise<void> {
  try {
    const fullPath = path.resolve(repoPath)
    const env = database ? getGitEnvironment(database) : undefined

    if (paths.length === 0) {
      return
    }

    for (const filePath of paths) {
      await executeCommand(['git', '-C', fullPath, 'add', filePath], { env })
    }

    logger.info(`Successfully staged ${paths.length} file(s) for ${repoPath}`)
  } catch (error: unknown) {
    logger.error(`Failed to stage files for ${repoPath}:`, error)
    throw new Error(`Failed to stage files: ${getErrorMessage(error)}`)
  }
}

export async function unstageFiles(repoPath: string, paths: string[], database?: Database): Promise<void> {
  try {
    const fullPath = path.resolve(repoPath)
    const env = database ? getGitEnvironment(database) : undefined

    if (paths.length === 0) {
      return
    }

    for (const filePath of paths) {
      await executeCommand(['git', '-C', fullPath, 'restore', '--staged', filePath], { env })
    }

    logger.info(`Successfully unstaged ${paths.length} file(s) for ${repoPath}`)
  } catch (error: unknown) {
    logger.error(`Failed to unstage files for ${repoPath}:`, error)
    throw new Error(`Failed to unstage files: ${getErrorMessage(error)}`)
  }
}

export async function getGitLog(repoPath: string, limit: number = 10, database?: Database): Promise<GitCommit[]> {
  try {
    const fullPath = path.resolve(repoPath)
    const env = database ? getGitEnvironment(database) : undefined

    const output = await executeCommand([
      'git',
      '-C',
      fullPath,
      'log',
      `-n`,
      String(limit),
      '--format=%H|%an|%ae|%ai|%s'
    ], { env })

    const lines = output.trim().split('\n')
    const commits: GitCommit[] = []

    for (const line of lines) {
      if (!line.trim()) continue

      const [hash, authorName, authorEmail, date, message] = line.split('|', 5)

      if (hash) {
        commits.push({
          hash,
          authorName,
          authorEmail,
          date,
          message: message || ''
        })
      }
    }

    return commits
  } catch (error: unknown) {
    logger.error(`Failed to get git log for ${repoPath}:`, error)
    throw new Error(`Failed to get git log: ${getErrorMessage(error)}`)
  }
}
