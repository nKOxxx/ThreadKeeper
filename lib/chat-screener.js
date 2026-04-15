/**
 * Chat Screener
 * Scans all existing Claude Code chats and extracts context
 * Runs during installation to create baseline memories
 */

import sqlite3 from 'sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { readdirSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { SecurityFilter } from './security-filter.js';
import { ChatAnalyzer } from './chat-analyzer.js';
import { MemoryExporter } from './memory-exporter.js';

const CLAUDE_PROJECTS_PATH = join(homedir(), '.claude', 'projects');
const DATA_LAKE_BASE = join(homedir(), '.threadkeeper', 'data-lake');

export class ChatScreener {
  constructor() {
    this.totalChatsScanned = 0;
    this.totalMemoriesCreated = 0;
    this.chatsWithContext = 0;
    this.securityFilter = new SecurityFilter();
    this.memoryExporter = new MemoryExporter();
    this.sensitiveDetections = 0;
    this.filteredMemories = 0;
  }

  /**
   * Scan all existing chats and extract context
   */
  async scanAllChats(onProgress) {
    try {
      if (!existsSync(CLAUDE_PROJECTS_PATH)) {
        if (onProgress) onProgress('No Claude Code chats found');
        return { scanned: 0, created: 0 };
      }

      const chats = this.discoverChats();

      if (chats.length === 0) {
        if (onProgress) onProgress('No Claude Code chats found');
        return { scanned: 0, created: 0 };
      }

      if (onProgress) onProgress(`Found ${chats.length} chats. Scanning for context...`);

      for (const chat of chats) {
        await this.scanChat(chat, onProgress);
      }

      if (onProgress) {
        onProgress(`✅ Scanned ${this.totalChatsScanned} chats, created ${this.totalMemoriesCreated} context memories`);
        if (this.sensitiveDetections > 0) {
          onProgress(`⚠️  Security: ${this.sensitiveDetections} sensitive detections, ${this.filteredMemories} memories filtered`);
        }
      }

      return {
        scanned: this.totalChatsScanned,
        created: this.totalMemoriesCreated,
        withContext: this.chatsWithContext,
        securityReport: {
          sensitiveDetections: this.sensitiveDetections,
          filteredMemories: this.filteredMemories,
          auditLogPath: this.securityFilter.getAuditLogPath()
        }
      };
    } catch (error) {
      console.error('Error scanning chats:', error);
      throw error;
    }
  }

  /**
   * Discover all Claude Code chats
   */
  discoverChats() {
    try {
      const entries = readdirSync(CLAUDE_PROJECTS_PATH, { withFileTypes: true });
      const chats = [];

      entries.forEach(entry => {
        if (entry.isDirectory()) {
          const decodedName = decodeURIComponent(entry.name);
          chats.push({
            id: entry.name,
            name: decodedName,
            path: join(CLAUDE_PROJECTS_PATH, entry.name)
          });
        }
      });

      return chats.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error discovering chats:', error);
      return [];
    }
  }

  /**
   * Scan a single chat for context
   */
  async scanChat(chat, onProgress) {
    try {
      if (!existsSync(chat.path)) {
        return;
      }

      // Find JSONL session files
      const allFiles = readdirSync(chat.path);
      const sessionFiles = allFiles
        .filter(file => file.endsWith('.jsonl'))
        .map(file => join(chat.path, file));

      if (sessionFiles.length === 0) {
        return;
      }

      // Extract memories from sessions
      const memories = [];
      for (const sessionFile of sessionFiles) {
        const extracted = await this.extractFromSession(sessionFile, chat.id);
        memories.push(...extracted);
      }

      if (memories.length === 0) {
        return;
      }

      // Store in database
      await this.storeMemories(chat.id, memories);

      // Export to desktop folder
      this.memoryExporter.exportMemories(chat.id, memories);

      this.totalChatsScanned++;
      this.chatsWithContext++;
      this.totalMemoriesCreated += memories.length;

      if (onProgress) {
        onProgress(`  ✓ ${chat.name} (${memories.length} context items)`);
      }
    } catch (error) {
      console.error(`Error scanning chat ${chat.name}:`, error.message);
    }
  }

  /**
   * Extract context from a session JSONL file using Claude API
   */
  async extractFromSession(sessionPath, chatId) {
    try {
      // Use ChatAnalyzer to intelligently extract insights
      const analyzer = new ChatAnalyzer();
      const insights = await analyzer.analyzeChatFile(sessionPath);

      if (insights.length === 0) {
        return [];
      }

      // Apply security filtering to all extracted insights
      const memories = insights.map(insight => {
        const memory = {
          ...insight,
          id: randomUUID(),
          project: chatId
        };

        // Apply security filtering
        const result = this.securityFilter.processMemory(memory, {
          encrypt: false,
          detectOnly: false
        });

        if (result.findings.length > 0) {
          this.sensitiveDetections += result.findings.length;
          if (result.action === 'filtered') {
            this.filteredMemories++;
          }
        }

        return result.memory;
      });

      // Flush any pending audit logs
      this.securityFilter.flushAuditLog();

      return memories;
    } catch (error) {
      console.error(`Error extracting from session ${sessionPath}:`, error.message);
      return [];
    }
  }

  /**
   * Store memories in database
   */
  async storeMemories(chatId, memories) {
    return new Promise((resolve, reject) => {
      const dbDir = join(DATA_LAKE_BASE, `memory-${chatId}`);
      const dbPath = join(dbDir, 'bridge.db');

      // Create directory if needed
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create table if needed
        db.run(`
          CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            content_type TEXT DEFAULT 'insight',
            importance INTEGER DEFAULT 5,
            project TEXT DEFAULT 'general',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Insert memories
          const stmt = db.prepare(`
            INSERT OR IGNORE INTO memories
            (id, content, content_type, importance, project, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          let completed = 0;
          const now = new Date().toISOString();

          memories.forEach(memory => {
            stmt.run(
              [memory.id, memory.content, memory.content_type, memory.importance,
               memory.project, now, now],
              (err) => {
                if (err) console.error('Error storing memory:', err);
                completed++;
                if (completed === memories.length) {
                  stmt.finalize();
                  db.close();
                  resolve();
                }
              }
            );
          });

          if (memories.length === 0) {
            stmt.finalize();
            db.close();
            resolve();
          }
        });
      });
    });
  }
}
