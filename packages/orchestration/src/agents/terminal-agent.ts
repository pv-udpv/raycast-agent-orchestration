/**
 * Terminal Agent: Safe shell command dispatch with sandboxing
 * Executes terminal commands with:
 * - Allowlist-based command filtering
 * - Timeout enforcement
 * - Output capture (stdout/stderr)
 * - Exit code tracking
 */

import { spawn } from 'child_process';
import { AgentTask, AgentResult, AgentType } from '../types/agent.js';

interface TerminalInput {
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
  allowlistPattern?: RegExp;
}

interface TerminalOutput {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

/**
 * Safe command allowlist patterns
 * Prevents execution of destructive commands
 */
const COMMAND_ALLOWLIST = [
  // VCS
  /^git\s+/,
  /^gh\s+/,

  // File operations (read-only + safe writes)
  /^ls\s+/,
  /^pwd$/,
  /^find\s+/,
  /^cat\s+/,
  /^head\s+/,
  /^tail\s+/,
  /^wc\s+/,
  /^grep\s+/,

  // Node/npm (safe)
  /^npm\s+(list|view|search|info)/,
  /^node\s+/,
  /^pnpm\s+(list|info)/,

  // Directory traversal
  /^cd\s+/,
  /^pushd\s+/,
  /^popd\s+/,

  // Status checks
  /^ps\s+/,
  /^uname\s+/,
  /^whoami$/,
  /^date$/,
  /^df\s+/,
  /^du\s+/,

  // Diagnostics
  /^which\s+/,
  /^env\s+/,
  /^printenv\s+/,
];

/**
 * Blocked command patterns
 * Explicitly forbidden regardless of allowlist
 */
const COMMAND_BLOCKLIST = [
  /^rm\s+/,
  /^rmdir\s+/,
  /^dd\s+/,
  /^mkfs\s+/,
  /^passwd\s+/,
  /^sudo\s+/,
  /^reboot$/,
  /^shutdown\s+/,
  /^kill\s+-9\s+/,
];

export class TerminalAgent {
  agentType: AgentType = 'terminal';

  async execute(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    const input = task.input as TerminalInput;

    try {
      // Validate input
      if (!input.command) {
        throw new Error('TerminalInput.command is required');
      }

      // Security checks
      const validation = this.validateCommand(
        input.command,
        input.allowlistPattern
      );
      if (!validation.allowed) {
        throw new Error(`Command blocked: ${validation.reason}`);
      }

      // Execute command
      const result = await this.executeCommand(
        input.command,
        input.args || [],
        input.cwd,
        input.timeout || 30000
      );

      return {
        taskId: task.id,
        agentType: this.agentType,
        status: result.exitCode === 0 ? 'success' : 'failed',
        output: {
          command: result.command,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          duration: result.duration,
        },
        metadata: {
          duration: Date.now() - startTime,
          retries: 0,
        },
      };
    } catch (err) {
      return {
        taskId: task.id,
        agentType: this.agentType,
        status: 'failed',
        error: {
          code: 'TERMINAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
        metadata: {
          duration: Date.now() - startTime,
          retries: 0,
        },
      };
    }
  }

  /**
   * Validate command against allowlist/blocklist
   */
  private validateCommand(
    command: string,
    customPattern?: RegExp
  ): { allowed: boolean; reason?: string } {
    // Check blocklist first
    for (const pattern of COMMAND_BLOCKLIST) {
      if (pattern.test(command)) {
        return { allowed: false, reason: 'Command is in blocklist' };
      }
    }

    // Check allowlist
    if (customPattern && customPattern.test(command)) {
      return { allowed: true };
    }

    for (const pattern of COMMAND_ALLOWLIST) {
      if (pattern.test(command)) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason: 'Command not in allowlist',
    };
  }

  /**
   * Execute command via spawn with stdio capture
   */
  private executeCommand(
    command: string,
    args: string[],
    cwd?: string,
    timeoutMs: number = 30000
  ): Promise<TerminalOutput> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';

      const process = spawn(command, args, {
        cwd: cwd || process.cwd(),
        timeout: timeoutMs,
        shell: true,
      });

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutHandle = setTimeout(() => {
        process.kill();
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      process.on('close', (code) => {
        clearTimeout(timeoutHandle);

        resolve({
          command,
          exitCode: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          duration: Date.now() - startTime,
        });
      });

      process.on('error', (err) => {
        clearTimeout(timeoutHandle);
        reject(err);
      });
    });
  }
}

export const terminalAgent = new TerminalAgent();
