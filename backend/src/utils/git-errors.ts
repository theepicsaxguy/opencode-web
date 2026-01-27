export function isNoUpstreamError(error: Error): boolean {
  const message = error.message.toLowerCase()
  return message.includes('no upstream branch') || 
         (message.includes('the current branch') && message.includes('has no upstream')) ||
         message.includes('missing upstream configuration')
}

export function parseBranchNameFromError(error: Error): string | null {
  // Extract branch name from error message like:
  // "The current branch feature-branch has no upstream branch"
  const match = error.message.match(/The current branch (.+) has no upstream branch/)
  return match ? match[1] : null
}