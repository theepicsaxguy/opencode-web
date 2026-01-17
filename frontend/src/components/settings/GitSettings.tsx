import { useState, useEffect } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { Loader2, Plus, Trash2, Save, Check, X, TestTube } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { showToast } from '@/lib/toast'
import { GitCredentialDialog } from './GitCredentialDialog'
import { settingsApi } from '@/api/settings'
import type { GitCredential, GitIdentity } from '@/api/types/settings'

export function GitSettings() {
  const { preferences, isLoading, updateSettingsAsync, isUpdating } = useSettings()
  const [gitCredentials, setGitCredentials] = useState<GitCredential[]>([])
  const [gitIdentity, setGitIdentity] = useState<GitIdentity>({ name: '', email: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [hasCredentialChanges, setHasCredentialChanges] = useState(false)
  const [hasIdentityChanges, setHasIdentityChanges] = useState(false)
  const [isCredentialDialogOpen, setIsCredentialDialogOpen] = useState(false)
  const [editingCredentialIndex, setEditingCredentialIndex] = useState<number | null>(null)
  const [testingCredentialIndex, setTestingCredentialIndex] = useState<number | null>(null)
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message?: string }>>({})

  useEffect(() => {
    if (preferences) {
      setGitCredentials(preferences.gitCredentials || [])
      setGitIdentity(preferences.gitIdentity || { name: '', email: '' })
      setHasCredentialChanges(false)
      setHasIdentityChanges(false)
    }
  }, [preferences])

  const checkForCredentialChanges = (newCredentials: GitCredential[]) => {
    const currentCreds = JSON.stringify(preferences?.gitCredentials || [])
    const newCreds = JSON.stringify(newCredentials)
    setHasCredentialChanges(currentCreds !== newCreds)
  }

  const checkForIdentityChanges = (newIdentity: GitIdentity) => {
    const currentIdentity = preferences?.gitIdentity || { name: '', email: '' }
    setHasIdentityChanges(
      currentIdentity.name !== newIdentity.name || 
      currentIdentity.email !== newIdentity.email
    )
  }

  const openAddCredentialDialog = () => {
    setEditingCredentialIndex(null)
    setIsCredentialDialogOpen(true)
  }

  const openEditCredentialDialog = (index: number) => {
    setEditingCredentialIndex(index)
    setIsCredentialDialogOpen(true)
  }

  const saveCredential = async (credential: GitCredential) => {
    let newCredentials: GitCredential[]
    
    if (editingCredentialIndex !== null) {
      newCredentials = [...gitCredentials]
      newCredentials[editingCredentialIndex] = credential
    } else {
      newCredentials = [...gitCredentials, credential]
    }
    
    setGitCredentials(newCredentials)
    checkForCredentialChanges(newCredentials)
    clearTestResult(editingCredentialIndex ?? newCredentials.length - 1)
  }

  const removeCredential = (index: number) => {
    const newCredentials = gitCredentials.filter((_, i) => i !== index)
    setGitCredentials(newCredentials)
    checkForCredentialChanges(newCredentials)
    clearTestResult(index)
  }

  const updateIdentity = (field: keyof GitIdentity, value: string) => {
    const newIdentity = { ...gitIdentity, [field]: value }
    setGitIdentity(newIdentity)
    checkForIdentityChanges(newIdentity)
  }

  const testCredential = async (index: number) => {
    const credential = gitCredentials[index]
    if (!credential) return

    setTestingCredentialIndex(index)
    try {
      const result = await settingsApi.testGitCredential(credential)
      setTestResults(prev => ({ 
        ...prev, 
        [index]: { 
          success: result.success, 
          message: result.error 
        } 
      }))
      
      if (result.success) {
        showToast.success(`Successfully connected to ${credential.host}`)
      } else {
        showToast.error(`Connection failed: ${result.error || 'Unknown error'}`)
      }
    } catch {
      const errorMsg = 'Failed to test credential'
      setTestResults(prev => ({ ...prev, [index]: { success: false, message: errorMsg } }))
      showToast.error(errorMsg)
    } finally {
      setTestingCredentialIndex(null)
    }
  }

  const clearTestResult = (index: number) => {
    setTestResults(prev => {
      const newResults = { ...prev }
      delete newResults[index]
      return newResults
    })
  }

  const saveCredentials = async () => {
    setIsSaving(true)
    try {
      showToast.loading('Saving credentials and restarting server...', { id: 'git-credentials' })
      await updateSettingsAsync({ gitCredentials })
      setHasCredentialChanges(false)
      showToast.success('Git credentials updated', { id: 'git-credentials' })
    } catch {
      showToast.error('Failed to update git credentials', { id: 'git-credentials' })
    } finally {
      setIsSaving(false)
    }
  }

  const saveIdentity = async () => {
    setIsSaving(true)
    try {
      showToast.loading('Saving git identity...', { id: 'git-identity' })
      await updateSettingsAsync({ gitIdentity })
      setHasIdentityChanges(false)
      showToast.success('Git identity updated', { id: 'git-identity' })
    } catch {
      showToast.error('Failed to update git identity', { id: 'git-identity' })
    } finally {
      setIsSaving(false)
    }
  }

  const maskToken = (token: string) => {
    if (!token) return ''
    if (token.length <= 8) return '•'.repeat(token.length)
    return token.slice(0, 8) + '...'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Git Identity</h2>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure the default author identity used for git commits in local repositories.
            Leave empty to use system defaults.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="git-name">Name</Label>
              <Input
                id="git-name"
                placeholder="Your Name"
                value={gitIdentity.name}
                onChange={(e) => updateIdentity('name', e.target.value)}
                disabled={isSaving}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="git-email">Email</Label>
              <Input
                id="git-email"
                type="email"
                placeholder="you@example.com"
                value={gitIdentity.email}
                onChange={(e) => updateIdentity('email', e.target.value)}
                disabled={isSaving}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          
          {hasIdentityChanges && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={saveIdentity}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Identity
              </Button>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            If not configured, defaults to "OpenCode User" and "opencode@localhost" for new local repositories.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Git Credentials</h2>
            <p className="text-sm text-muted-foreground">
              Add credentials for cloning private repositories from any Git host
            </p>
          </div>
          <div className="flex gap-2">
            {hasCredentialChanges && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={saveCredentials}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAddCredentialDialog}
              disabled={isSaving}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {gitCredentials.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No git credentials configured. Click "Add" to add credentials for GitHub, GitLab, Gitea, or other Git hosts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {gitCredentials.map((cred, index) => (
              <div key={index} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground mb-1">{cred.name || 'Unnamed Credential'}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Host:</span>
                        <span className="text-foreground">{cred.host || 'Not configured'}</span>
                      </div>
                      {cred.username && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>Username:</span>
                          <span className="text-foreground">{cred.username}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Token:</span>
                        <span className="font-mono text-foreground">{maskToken(cred.token)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {testResults[index] && (
                      <div className={`flex items-center gap-1 text-xs ${testResults[index].success ? 'text-green-500' : 'text-red-500'}`}>
                        {testResults[index].success ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{testResults[index].success ? 'Connected' : testResults[index].message || 'Failed'}</span>
                      </div>
                    )}
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => testCredential(index)}
                      disabled={testingCredentialIndex === index}
                      title="Test Connection"
                    >
                      {testingCredentialIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditCredentialDialog(index)}
                      disabled={isSaving}
                      title="Edit"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCredential(index)}
                      disabled={isSaving}
                      className="text-destructive hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-4">
          Username defaults: github.com uses "x-access-token", gitlab.com uses "oauth2". For other hosts, specify your username if required.
        </p>

        {isUpdating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
      </div>

      <GitCredentialDialog
        open={isCredentialDialogOpen}
        onOpenChange={setIsCredentialDialogOpen}
        onSave={saveCredential}
        credential={editingCredentialIndex !== null ? gitCredentials[editingCredentialIndex] : undefined}
        isSaving={isSaving}
      />
    </div>
  )
}
