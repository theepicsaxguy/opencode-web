import { Loader2, Save } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GitIdentity } from '@/api/types/settings'

interface GitIdentitySettingsProps {
  gitIdentity: GitIdentity
  hasIdentityChanges: boolean
  isSaving: boolean
  onUpdateIdentity: (field: keyof GitIdentity, value: string) => void
  onSaveIdentity: () => void
}

export function GitIdentitySettings({
  gitIdentity,
  hasIdentityChanges,
  isSaving,
  onUpdateIdentity,
  onSaveIdentity,
}: GitIdentitySettingsProps) {
  return (
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
              onChange={(e) => onUpdateIdentity('name', e.target.value)}
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
              onChange={(e) => onUpdateIdentity('email', e.target.value)}
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
              onClick={onSaveIdentity}
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
  )
}