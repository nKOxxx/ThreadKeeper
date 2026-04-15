/**
 * Context Retriever
 * Searches across all past chat memories and returns relevant context
 */

import sqlite3 from 'sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { readdirSync, existsSync } from 'fs';

export class ContextRetriever {
  constructor() {
    this.dataLakePath = join(homedir(), '.threadkeeper', 'data-lake');
    this.databases = [];
  }

  /**
   * Search for relevant context across all chat databases
   * Uses semantic similarity and keyword matching
   */
  async search(query, options = {}) {
    const limit = options.limit || 5;

    try {
      // Find all memory databases
      const memories = await this.searchAllDatabases(query);

      // Sort by relevance score
      memories.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      // Return top N results
      return memories.slice(0, limit);
    } catch (error) {
      console.error('Error searching context:', error);
      return [];
    }
  }

  /**
   * Search across all available chat databases
   */
  async searchAllDatabases(query) {
    const results = [];

    try {
      if (!existsSync(this.dataLakePath)) {
        return results;
      }

      const memoryDirs = readdirSync(this.dataLakePath)
        .filter(name => name.startsWith('memory-'))
        .map(name => join(this.dataLakePath, name));

      // Search each database
      for (const dbDir of memoryDirs) {
        const dbPath = join(dbDir, 'bridge.db');
        if (existsSync(dbPath)) {
          const memories = await this.searchDatabase(dbPath, query);
          results.push(...memories);
        }
      }
    } catch (error) {
      console.error('Error searching all databases:', error);
    }

    return results;
  }

  /**
   * Search a single database for relevant memories
   */
  async searchDatabase(dbPath, query) {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error(`Error opening database ${dbPath}:`, err);
          resolve([]);
          return;
        }

        // Search using keyword matching and content type relevance
        const keywords = this.extractKeywords(query);

        if (keywords.length === 0) {
          // If no keywords, just return recent memories
          db.all(
            `SELECT id, content, content_type, importance, project, created_at
             FROM memories
             WHERE content_type IN ('decision', 'insight', 'technology', 'achievement')
             ORDER BY importance DESC, created_at DESC
             LIMIT 10`,
            [],
            (err, rows) => {
              if (err) {
                console.error(`Error querying database ${dbPath}:`, err);
                resolve([]);
                return;
              }

              const results = (rows || []).map(row => ({
                ...row,
                relevanceScore: 1
              }));

              db.close();
              resolve(results);
            }
          );
          return;
        }

        const searchTerms = keywords.map(k => `%${k}%`);
        const whereClauses = keywords.map(() => 'content LIKE ?').join(' OR ');

        db.all(
          `SELECT id, content, content_type, importance, project, created_at
           FROM memories
           WHERE content_type IN ('decision', 'insight', 'technology', 'achievement')
           AND (${whereClauses})
           ORDER BY importance DESC, created_at DESC
           LIMIT 10`,
          searchTerms,
          (err, rows) => {
            if (err) {
              console.error(`Error querying database ${dbPath}:`, err);
              resolve([]);
              return;
            }

            // Calculate relevance scores
            const results = (rows || []).map(row => ({
              ...row,
              relevanceScore: this.calculateRelevance(row.content, query)
            }));

            db.close();
            resolve(results);
          }
        );
      });
    });
  }

  /**
   * Extract keywords from query for matching
   */
  extractKeywords(query) {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 5);
  }

  /**
   * Calculate relevance score based on keyword matches
   */
  calculateRelevance(content, query) {
    const keywords = this.extractKeywords(query);
    const contentLower = content.toLowerCase();

    let score = 0;
    keywords.forEach(keyword => {
      const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
      score += matches * 10;
    });

    return score;
  }

  /**
   * List all available chats with their directory names
   */
  async listAvailableChats() {
    const chats = [];
    try {
      if (!existsSync(this.dataLakePath)) {
        return chats;
      }

      const memoryDirs = readdirSync(this.dataLakePath)
        .filter(name => name.startsWith('memory-'))
        .map(name => {
          // Extract chat identifier from directory name
          const chatId = name.replace('memory-', '');
          // Decode URL-encoded path
          const decodedId = decodeURIComponent(chatId);
          return {
            dirName: name,
            chatId: decodedId,
            displayName: decodedId.split('/').pop() // Get last part of path
          };
        });

      return memoryDirs;
    } catch (error) {
      console.error('Error listing chats:', error);
      return chats;
    }
  }

  /**
   * Get memories from specific chats by name (fuzzy match)
   */
  async getMemoriesFromChats(chatNames) {
    const results = {};

    try {
      const allChats = await this.listAvailableChats();

      for (const targetName of chatNames) {
        const targetLower = targetName.toLowerCase();

        // Find matching chats (fuzzy matching)
        const matches = allChats.filter(chat =>
          chat.displayName.toLowerCase().includes(targetLower) ||
          chat.chatId.toLowerCase().includes(targetLower)
        );

        for (const match of matches) {
          const dbPath = join(this.dataLakePath, match.dirName, 'bridge.db');
          if (existsSync(dbPath)) {
            const memories = await this.getAllMemoriesFromDatabase(dbPath);
            results[match.displayName] = memories;
          }
        }
      }
    } catch (error) {
      console.error('Error getting memories from chats:', error);
    }

    return results;
  }

  /**
   * Get ALL memories from a specific database (not just limited results)
   */
  async getAllMemoriesFromDatabase(dbPath) {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error(`Error opening database ${dbPath}:`, err);
          resolve([]);
          return;
        }

        db.all(
          `SELECT id, content, content_type, importance, project, created_at
           FROM memories
           WHERE content_type IN ('decision', 'insight', 'technology', 'achievement')
           ORDER BY content_type ASC, importance DESC`,
          [],
          (err, rows) => {
            if (err) {
              console.error(`Error querying database ${dbPath}:`, err);
              resolve([]);
              return;
            }

            db.close();
            resolve(rows || []);
          }
        );
      });
    });
  }

  /**
   * Analyze connections between memories (common technologies, decisions, patterns)
   */
  analyzeConnections(memoriesMap) {
    const connections = {
      sharedTechnologies: new Set(),
      sharedDecisions: new Set(),
      commonThemes: new Map()
    };

    // Extract all memories regardless of chat source
    const allMemories = Object.values(memoriesMap).flat();

    // Find shared technologies
    const technologies = allMemories
      .filter(m => m.content_type === 'technology')
      .map(m => m.content.toLowerCase());

    technologies.forEach(tech => {
      if (technologies.filter(t => t === tech).length > 1) {
        connections.sharedTechnologies.add(tech);
      }
    });

    // Find common themes in decisions
    const decisions = allMemories.filter(m => m.content_type === 'decision');
    const keywords = {};
    decisions.forEach(d => {
      const words = d.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 5) {
          keywords[word] = (keywords[word] || 0) + 1;
        }
      });
    });

    // Extract themes that appear in multiple decisions
    Object.entries(keywords)
      .filter(([_, count]) => count > 1)
      .forEach(([keyword, count]) => {
        connections.commonThemes.set(keyword, count);
      });

    return connections;
  }
}
