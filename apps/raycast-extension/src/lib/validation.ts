// Input validation + state validators

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

/**
 * Validate chat/branch title format: `NN-slug`
 * Examples: `00-root`, `10-git-worktree`, `20-zbst-tech-subagents`
 */
export function validateTitle(title: string): boolean {
  const pattern = /^[0-9]{2}-[a-z0-9-]+$/
  return pattern.test(title)
}

/**
 * Validate branch order: 00 < 10 < 20 < ... < 90
 */
export function validateBranchOrder(titles: string[]): boolean {
  const prefixes = titles
    .map(t => {
      const match = t.match(/^([0-9]{2})-/)
      return match ? parseInt(match[1], 10) : null
    })
    .filter((p): p is number => p !== null)

  for (let i = 1; i < prefixes.length; i++) {
    if (prefixes[i] <= prefixes[i - 1]) {
      return false
    }
  }
  return true
}

/**
 * Validate folder name pattern (loose)
 * Examples: `00-ollama-launch-harness-research`
 */
export function validateFolderName(name: string): boolean {
  return /^[0-9]{2}-[a-z0-9-]*research[a-z0-9-]*$/i.test(name)
}

/**
 * Validate workload scope input
 */
export function validateWorkloadScope(scope: string): void {
  if (!scope || scope.length === 0) {
    throw new ValidationError("Workload scope cannot be empty")
  }
  if (scope.length > 100) {
    throw new ValidationError("Workload scope too long (max 100 chars)")
  }
  if (!/^[a-z0-9-]+$/i.test(scope)) {
    throw new ValidationError(
      "Workload scope must contain only letters, numbers, and hyphens"
    )
  }
}

/**
 * Validate that titles form a valid branch tree
 */
export function validateBranchTree(titles: string[]): void {
  // Check all titles are valid format
  for (const title of titles) {
    if (!validateTitle(title)) {
      throw new ValidationError(`Invalid title format: "${title}"`)
    }
  }

  // Check order
  if (!validateBranchOrder(titles)) {
    throw new ValidationError("Branch order is not strictly increasing")
  }

  // Check for duplicates
  if (new Set(titles).size !== titles.length) {
    throw new ValidationError("Duplicate branch titles found")
  }

  // Check coverage: should include 00, 10, 20, ..., 90 (flexible)
  const prefixes = new Set(
    titles.map(t => {
      const match = t.match(/^([0-9]{2})-/)
      return match ? match[1] : null
    })
  )

  if (prefixes.has(null)) {
    throw new ValidationError("Some titles do not have valid prefixes")
  }
}

/**
 * Retry logic for network calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, backoffMs * attempt))
      }
    }
  }

  throw lastError || new Error("All retries failed")
}

/**
 * Timeout wrapper for async operations
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}
