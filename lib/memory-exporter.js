/**
 * Memory Exporter
 * Exports extracted memories to a human-readable folder structure on desktop
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export class MemoryExporter {
  constructor() {
    this.exportPath = join(homedir(), 'Desktop', 'Threadkeeper');
  }

  /**
   * Export memories from a chat to desktop folder
   */
  exportMemories(chatName, memories) {
    try {
      // Create chat folder
      const chatFolder = join(this.exportPath, this.sanitizeFolderName(chatName));
      if (!existsSync(chatFolder)) {
        mkdirSync(chatFolder, { recursive: true });
      }

      // Export as JSON (machine-readable)
      this.exportJSON(chatFolder, memories);

      // Export as Markdown (human-readable)
      this.exportMarkdown(chatFolder, chatName, memories);

      return chatFolder;
    } catch (error) {
      console.error('Error exporting memories:', error.message);
      return null;
    }
  }

  /**
   * Export memories as JSON file
   */
  exportJSON(folderPath, memories) {
    const jsonPath = join(folderPath, 'memories.json');
    const jsonData = {
      exportDate: new Date().toISOString(),
      totalMemories: memories.length,
      memories: memories.map(m => ({
        type: m.content_type,
        content: m.content,
        importance: m.importance,
        created: m.created_at || new Date().toISOString()
      }))
    };

    writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  }

  /**
   * Export memories as human-readable Markdown
   */
  exportMarkdown(folderPath, chatName, memories) {
    const mdPath = join(folderPath, 'insights.md');

    // Group memories by type
    const grouped = this.groupByType(memories);

    // Build markdown
    let markdown = `# ${this.decodeChatName(chatName)}\n\n`;
    markdown += `**Extracted:** ${new Date().toLocaleString()}\n\n`;
    markdown += `**Total insights:** ${memories.length}\n\n`;
    markdown += `---\n\n`;

    // Decisions
    if (grouped.decision && grouped.decision.length > 0) {
      markdown += `## 📋 Key Decisions\n\n`;
      grouped.decision.forEach((m, i) => {
        markdown += `${i + 1}. ${m.content}\n`;
      });
      markdown += '\n';
    }

    // Achievements
    if (grouped.achievement && grouped.achievement.length > 0) {
      markdown += `## ✅ Achievements\n\n`;
      grouped.achievement.forEach((m, i) => {
        markdown += `${i + 1}. ${m.content}\n`;
      });
      markdown += '\n';
    }

    // Learnings
    if (grouped.insight && grouped.insight.length > 0) {
      markdown += `## 💡 Key Learnings\n\n`;
      grouped.insight.forEach((m, i) => {
        markdown += `${i + 1}. ${m.content}\n`;
      });
      markdown += '\n';
    }

    // Technologies
    if (grouped.technology && grouped.technology.length > 0) {
      markdown += `## 🔧 Technologies Used\n\n`;
      grouped.technology.forEach((m, i) => {
        markdown += `${i + 1}. ${m.content}\n`;
      });
      markdown += '\n';
    }

    markdown += `---\n\n`;
    markdown += `*These insights were automatically extracted from your Claude Code chats.*\n`;
    markdown += `*To use in a new session, run: \`threadkeeper inject "${this.decodeChatName(chatName)}"\`*\n`;

    writeFileSync(mdPath, markdown, 'utf-8');
  }

  /**
   * Group memories by type
   */
  groupByType(memories) {
    const grouped = {};
    memories.forEach(m => {
      if (!grouped[m.content_type]) {
        grouped[m.content_type] = [];
      }
      grouped[m.content_type].push(m);
    });
    return grouped;
  }

  /**
   * Sanitize chat name for folder name
   */
  sanitizeFolderName(chatName) {
    return chatName
      .replace(/^-/, '') // Remove leading dash
      .replace(/\//g, '-') // Replace slashes with dashes
      .substring(0, 100); // Limit length
  }

  /**
   * Decode chat name from folder name
   */
  decodeChatName(chatName) {
    return chatName
      .replace(/^-/, '')
      .replace(/-/g, ' / ')
      .split('-')
      .map((part, i) => (i === 0 ? part : part.toLowerCase()))
      .join('');
  }

  /**
   * Get the export path
   */
  getExportPath() {
    return this.exportPath;
  }
}
