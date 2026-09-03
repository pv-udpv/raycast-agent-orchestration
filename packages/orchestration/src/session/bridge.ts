/**
 * Session Bridge: Multi-provider state sync
 * Maintains unified transcript across Claude, Comet, Perplexity MLX, Codex
 * Persists to SQLite for recovery and audit
 */

import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { ProviderName } from '../routing/provider-router.js';

export interface SessionMessage {
  id: string;
  provider: ProviderName | string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SessionState {
  sessionId: string;
  chatId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastProvider: string;
  metadata: Record<string, unknown>;
}

export class SessionBridge {
  private db: DatabaseSync;
  private sessionId: string;
  private chatId: string;

  constructor(
    sessionId: string,
    chatId: string,
    dbPath?: string
  ) {
    this.sessionId = sessionId;
    this.chatId = chatId;

    const storagePath =
      dbPath || join(homedir(), 'RaycastVault', '70-runtime', 'session.db');

    this.db = new DatabaseSync(storagePath);
    this.initializeTables();
  }

  /**
   * Initialize SQLite schema
   */
  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        message_count INTEGER DEFAULT 0,
        last_provider TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      );

      CREATE INDEX IF NOT EXISTS idx_session_provider ON messages(session_id, provider);
      CREATE INDEX IF NOT EXISTS idx_session_timestamp ON messages(session_id, timestamp);
    `);

    // Initialize session if not exists
    const existing = this.db
      .prepare('SELECT 1 FROM sessions WHERE session_id = ?')
      .get(this.sessionId);

    if (!existing) {
      this.db
        .prepare(`
          INSERT INTO sessions (session_id, chat_id, created_at, updated_at, metadata)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(
          this.sessionId,
          this.chatId,
          new Date().toISOString(),
          new Date().toISOString(),
          JSON.stringify({})
        );
    }
  }

  /**
   * Append message to transcript
   */
  appendMessage(
    provider: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>
  ): SessionMessage {
    const id = `${this.sessionId}-${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = new Date().toISOString();

    this.db
      .prepare(`
        INSERT INTO messages (id, session_id, provider, role, content, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        this.sessionId,
        provider,
        role,
        content,
        timestamp,
        metadata ? JSON.stringify(metadata) : null
      );

    // Update session metadata
    this.db
      .prepare(`
        UPDATE sessions
        SET updated_at = ?, message_count = message_count + 1, last_provider = ?
        WHERE session_id = ?
      `)
      .run(timestamp, provider, this.sessionId);

    return {
      id,
      provider,
      role,
      content,
      timestamp,
      metadata,
    };
  }

  /**
   * Get full transcript for provider (with fallback to all)
   */
  getTranscript(provider?: string, limit?: number): SessionMessage[] {
    let query = `
      SELECT id, provider, role, content, timestamp, metadata
      FROM messages
      WHERE session_id = ?
    `;

    const params: (string | number)[] = [this.sessionId];

    if (provider) {
      query += ` AND provider = ?`;
      params.push(provider);
    }

    query += ` ORDER BY timestamp ASC`;

    if (limit) {
      query += ` LIMIT ?`;
      params.push(limit);
    }

    return (this.db.prepare(query).all(...params) as any[]).map((row) => ({
      id: row.id,
      provider: row.provider,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * Normalize transcript across all providers
   * Returns unified message sequence for replay
   */
  getNormalizedTranscript(): SessionMessage[] {
    const allMessages = this.getTranscript();

    // Group by timestamp (within 100ms = same logical turn)
    const grouped = new Map<string, SessionMessage[]>();

    for (const msg of allMessages) {
      const bucketTime = Math.floor(
        new Date(msg.timestamp).getTime() / 100
      ).toString();
      if (!grouped.has(bucketTime)) {
        grouped.set(bucketTime, []);
      }
      grouped.get(bucketTime)!.push(msg);
    }

    // Flatten back to sequence, deduplicating identical content
    const normalized: SessionMessage[] = [];
    const seen = new Set<string>();

    for (const messages of Array.from(grouped.values()).sort()) {
      for (const msg of messages) {
        const key = `${msg.role}:${msg.content}`;
        if (!seen.has(key)) {
          normalized.push(msg);
          seen.add(key);
        }
      }
    }

    return normalized;
  }

  /**
   * Get session state
   */
  getState(): SessionState {
    const row = (this.db
      .prepare(`
        SELECT session_id, chat_id, created_at, updated_at, message_count, last_provider, metadata
        FROM sessions
        WHERE session_id = ?
      `)
      .get(this.sessionId) as any) || {};

    return {
      sessionId: row.session_id || this.sessionId,
      chatId: row.chat_id || this.chatId,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count || 0,
      lastProvider: row.last_provider || 'claude',
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    };
  }

  /**
   * Update session metadata
   */
  updateMetadata(metadata: Record<string, unknown>): void {
    const current = this.getState();
    const merged = { ...current.metadata, ...metadata };

    this.db
      .prepare(`
        UPDATE sessions
        SET metadata = ?, updated_at = ?
        WHERE session_id = ?
      `)
      .run(JSON.stringify(merged), new Date().toISOString(), this.sessionId);
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
