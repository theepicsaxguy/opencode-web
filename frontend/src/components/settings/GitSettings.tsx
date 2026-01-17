import { useState, useEffect } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { Loader2 } from 'lucide-react'
import { showToast } from '@/lib/toast'
import { GitCredentialDialog } from './GitCredentialDialog'
import { GitIdentitySettings } from './GitIdentitySettings'
import { GitCredentialsList } from './GitCredentialsList'
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
        if (result.maskedToken) {
          const updatedCredentials = [...gitCredentials]
          updatedCredentials[index] = {
            ...credential,
            token: result.maskedToken
          }
          setGitCredentials(updatedCredentials)
        }
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
      <GitIdentitySettings
        gitIdentity={gitIdentity}
        hasIdentityChanges={hasIdentityChanges}
        isSaving={isSaving}
        onUpdateIdentity={updateIdentity}
        onSaveIdentity={saveIdentity}
      />

      <GitCredentialsList
        gitCredentials={gitCredentials}
        hasCredentialChanges={hasCredentialChanges}
        isSaving={isSaving}
        isUpdating={isUpdating}
        testResults={testResults}
        testingCredentialIndex={testingCredentialIndex}
        onOpenAddDialog={openAddCredentialDialog}
        onOpenEditDialog={openEditCredentialDialog}
        onRemoveCredential={removeCredential}
        onTestCredential={testCredential}
        onSaveCredentials={saveCredentials}
        maskToken={maskToken}
      />

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
