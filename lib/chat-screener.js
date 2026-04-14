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

const CLAUDE_PROJECTS_PATH = join(homedir(), '.claude', 'projects');
const DATA_LAKE_BASE = join(homedir(), '.cognexia', 'data-lake');

export class ChatScreener {
  constructor() {
    this.totalChatsScanned = 0;
    this.totalMemoriesCreated = 0;
    this.chatsWithContext = 0;
    this.securityFilter = new SecurityFilter();
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
        const extracted = this.extractFromSession(sessionFile, chat.id);
        memories.push(...extracted);
      }

      if (memories.length === 0) {
        return;
      }

      // Store in database
      await this.storeMemories(chat.id, memories);

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
   * Extract context from a session JSONL file
   */
  extractFromSession(sessionPath, chatId) {
    try {
      const content = readFileSync(sessionPath, 'utf8');
      const lines = content.trim().split('\n');

      const memories = [];
      const topics = new Set();
      const decisions = [];
      const achievements = [];
      const technologies = new Set();

      // Parse each message
      lines.forEach((line) => {
        if (!line.trim()) return;

        try {
          const msg = JSON.parse(line);
          if (!msg.content || typeof msg.content !== 'string') return;

          const content = msg.content.toLowerCase();

          // Extract decisions
          if (content.includes('decision:') || content.includes('decided:') ||
              content.includes('will ') || content.includes('should ')) {
            const decision = msg.content.slice(0, 150).trim();
            if (decision.length > 10) {
              decisions.push(decision);
            }
          }

          // Extract achievements
          if (content.includes('implemented') || content.includes('completed') ||
              content.includes('finished') || content.includes('deployed') ||
              content.includes('shipped') || content.includes('launched')) {
            const achievement = msg.content.slice(0, 150).trim();
            if (achievement.length > 10) {
              achievements.push(achievement);
            }
          }

          // Extract topics/technologies
          if (content.length > 30 && content.length < 300) {
            // Look for common tech keywords
            const techKeywords = ['react', 'node', 'python', 'typescript', 'javascript',
              'database', 'api', 'backend', 'frontend', 'authentication', 'deployment',
              'docker', 'kubernetes', 'cloud', 'aws', 'vercel', 'github', 'git',
              'rest', 'graphql', 'sql', 'mongodb', 'postgres', 'redis', 'nextjs'];

            techKeywords.forEach(tech => {
              if (content.includes(tech)) {
                technologies.add(tech);
              }
            });

            // Add general topic
            const snippet = msg.content.slice(0, 80).trim();
            if (snippet.length > 10) {
              topics.add(snippet);
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      });

      // Create memory objects with security filtering
      const createAndFilterMemory = (content, contentType, importance) => {
        const memory = {
          id: randomUUID(),
          content: content,
          content_type: contentType,
          importance: importance,
          project: chatId
        };

        // Apply security filtering
        const result = this.securityFilter.processMemory(memory, {
          encrypt: false, // Don't encrypt yet, will do at storage
          detectOnly: false // Filter sensitive data
        });

        if (result.findings.length > 0) {
          this.sensitiveDetections += result.findings.length;
          if (result.action === 'filtered') {
            this.filteredMemories++;
          }
        }

        return result.memory;
      };

      Array.from(topics).slice(0, 3).forEach(topic => {
        memories.push(createAndFilterMemory(topic, 'topic', 5));
      });

      decisions.slice(0, 5).forEach(decision => {
        memories.push(createAndFilterMemory(decision, 'decision', 7));
      });

      achievements.slice(0, 3).forEach(achievement => {
        memories.push(createAndFilterMemory(achievement, 'achievement', 8));
      });

      Array.from(technologies).forEach(tech => {
        memories.push(createAndFilterMemory(tech, 'technology', 6));
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
