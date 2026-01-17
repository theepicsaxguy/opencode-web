import { Loader2, Plus, Trash2, Save, Check, X, TestTube } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GitCredential } from '@/api/types/settings'

interface GitCredentialsListProps {
  gitCredentials: GitCredential[]
  hasCredentialChanges: boolean
  isSaving: boolean
  isUpdating: boolean
  testResults: Record<number, { success: boolean; message?: string }>
  testingCredentialIndex: number | null
  onOpenAddDialog: () => void
  onOpenEditDialog: (index: number) => void
  onRemoveCredential: (index: number) => void
  onTestCredential: (index: number) => void
  onSaveCredentials: () => void
  maskToken: (token: string) => string
}

export function GitCredentialsList({
  gitCredentials,
  hasCredentialChanges,
  isSaving,
  isUpdating,
  testResults,
  testingCredentialIndex,
  onOpenAddDialog,
  onOpenEditDialog,
  onRemoveCredential,
  onTestCredential,
  onSaveCredentials,
  maskToken,
}: GitCredentialsListProps) {
  return (
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
              onClick={onSaveCredentials}
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
            onClick={onOpenAddDialog}
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
                    onClick={() => onTestCredential(index)}
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
                    onClick={() => onOpenEditDialog(index)}
                    disabled={isSaving}
                    title="Edit"
                  >
                    <Save className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveCredential(index)}
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
  )
}