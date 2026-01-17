import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { GitCommit, Loader2 } from 'lucide-react'

interface GitCommitBoxProps {
  repoId: number | undefined
  stagedCount: number
  isCommitting: boolean
  onCommit: (message: string) => void
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export function GitCommitBox({ repoId: _repoId, stagedCount, isCommitting, onCommit }: GitCommitBoxProps) {
  const [message, setMessage] = useState('')

  const canCommit = message.trim().length > 0 && stagedCount > 0 && !isCommitting

  const handleSubmit = () => {
    if (!canCommit) return
    onCommit(message.trim())
    setMessage('')
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Commit message"
        className="min-h-[60px] text-sm resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && canCommit) {
            e.preventDefault()
            handleSubmit()
          }
        }}
      />
      <Button
        onClick={handleSubmit}
        disabled={!canCommit}
        className="w-full"
      >
        {isCommitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Committing...
          </>
        ) : (
          <>
            <GitCommit className="w-4 h-4 mr-2" />
            Commit {stagedCount > 0 && `(${stagedCount})`}
          </>
        )}
      </Button>
    </div>
  )
}
