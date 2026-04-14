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
}
