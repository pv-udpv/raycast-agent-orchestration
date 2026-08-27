// Safe terminal operations (allowlisted commands only)

import { execSync } from "child_process"

/**
 * Allowlist of safe, idempotent terminal commands
 */
const ALLOWED_COMMANDS = {
  // Bootstrap operations (idempotent)
  bootstrap: "bash scripts/bootstrap-full.sh",
  cleanup: "bash scripts/cleanup-worktrees.sh",

  // Git operations
  worktreeList: "git worktree list",
  gitStatus: "git status --short",
  gitLog: "git log --oneline -10",

  // Info only
  repoRoot: "git rev-parse --show-toplevel",
}

export type AllowedCommand = keyof typeof ALLOWED_COMMANDS

/**
 * Execute an allowlisted command safely
 * Returns output as string; throws if command fails
 */
export function executeCommand(command: AllowedCommand): string {
  if (!(command in ALLOWED_COMMANDS)) {
    throw new Error(`Command not allowed: ${command}`)
  }

  const cmd = ALLOWED_COMMANDS[command]

  try {
    return execSync(cmd, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Command failed: ${command}\n${msg}`)
  }
}

/**
 * Get git repo root
 */
export function getRepoRoot(): string {
  return executeCommand("repoRoot")
}

/**
 * List git worktrees (info only)
 */
export function listWorktrees(): string[] {
  const output = executeCommand("worktreeList")
  return output
    .split("\n")
    .filter(line => line.includes("detached"))
    .map(line => line.split(" ")[0])
}

/**
 * Bootstrap git worktrees (idempotent)
 */
export function bootstrapWorktrees(): string {
  return executeCommand("bootstrap")
}

/**
 * Clean up stale worktrees (idempotent)
 */
export function cleanupWorktrees(): string {
  return executeCommand("cleanup")
}

/**
 * Get current git status
 */
export function getGitStatus(): string {
  return executeCommand("gitStatus")
}

/**
 * Reject any non-allowlisted command
 */
export function rejectCommand(cmd: string): never {
  throw new Error(`Command not allowed: ${cmd}. Only these are permitted: ${Object.keys(ALLOWED_COMMANDS).join(", ")}`)
}
