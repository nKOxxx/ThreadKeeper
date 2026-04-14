/**
 * Project Detector
 * Detects other projects on the system and warns about potential conflicts
 * Prevents Threadkeeper from accidentally mixing with other context/memory tools
 */

import { existsSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export class ProjectDetector {
  /**
   * Known projects that might conflict with Threadkeeper
   */
  static KNOWN_PROJECTS = {
    cognexia: {
      directory: '~/.cognexia',
      description: 'Cognexia - General semantic memory system',
      note: 'Uses separate data directory'
    },
    contextkeeper: {
      directory: '~/.contextkeeper',
      description: 'ContextKeeper - Context persistence tool',
      note: 'Uses separate data directory'
    },
    memorykeeper: {
      directory: '~/.memorykeeper',
      description: 'MemoryKeeper - Memory management tool',
      note: 'Uses separate data directory'
    },
    threadkeeper: {
      directory: '~/.threadkeeper',
      description: 'Threadkeeper - Claude Code context persistence',
      note: 'THIS PROJECT'
    }
  };

  /**
   * Detect other projects on the system
   */
  static detectConflicts() {
    const conflicts = [];

    for (const [name, info] of Object.entries(this.KNOWN_PROJECTS)) {
      const expandedPath = info.directory.replace('~', homedir());
      if (existsSync(expandedPath)) {
        const stats = statSync(expandedPath);
        conflicts.push({
          project: name,
          directory: info.directory,
          description: info.description,
          note: info.note,
          path: expandedPath,
          hasData: this.checkHasData(expandedPath),
          sizeBytes: this.getDirectorySize(expandedPath)
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if directory has meaningful data
   */
  static checkHasData(dirPath) {
    try {
      const dataLakePath = join(dirPath, 'data-lake');
      const auditLogsPath = join(dirPath, 'audit-logs');
      return existsSync(dataLakePath) || existsSync(auditLogsPath);
    } catch {
      return false;
    }
  }

  /**
   * Estimate directory size
   */
  static getDirectorySize(dirPath) {
    try {
      const walkDir = (path) => {
        let size = 0;
        const entries = require('fs').readdirSync(path, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(path, entry.name);
          if (entry.isDirectory()) {
            size += walkDir(fullPath);
          } else {
            size += statSync(fullPath).size;
          }
        }
        return size;
      };

      return walkDir(dirPath);
    } catch {
      return 0;
    }
  }

  /**
   * Format size in human-readable format
   */
  static formatSize(bytes) {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + sizes[i];
  }

  /**
   * Print warning about detected projects
   */
  static warnOnInstall() {
    const conflicts = this.detectConflicts();

    // Filter out Threadkeeper itself
    const otherProjects = conflicts.filter(c => c.project !== 'threadkeeper');

    if (otherProjects.length > 0) {
      console.log('\n⚠️  DETECTED OTHER PROJECTS:\n');
      otherProjects.forEach(project => {
        const dataNote = project.hasData ? ` (${this.formatSize(project.sizeBytes)} data)` : '';
        console.log(`  • ${project.project.toUpperCase()}`);
        console.log(`    Path: ${project.directory}${dataNote}`);
        console.log(`    ${project.description}`);
        console.log(`    ℹ️  ${project.note}\n`);
      });
      console.log('✅ Threadkeeper uses ~/.threadkeeper/ (completely separate)\n');
    }
  }

  /**
   * Prevent misconfiguration
   */
  static validateConfiguration() {
    const threadkeeperHome = process.env.THREADKEEPER_HOME;

    if (threadkeeperHome && threadkeeperHome.includes('cognexia')) {
      throw new Error(
        '\n❌ CONFIGURATION ERROR:\n\n' +
        'Threadkeeper is trying to use Cognexia directory.\n' +
        'THREADKEEPER_HOME=' + threadkeeperHome + '\n\n' +
        'Threadkeeper must use its own directory for data isolation.\n' +
        'Please set: THREADKEEPER_HOME=~/.threadkeeper\n'
      );
    }

    if (threadkeeperHome && threadkeeperHome.includes('contextkeeper')) {
      throw new Error(
        '\n❌ CONFIGURATION ERROR:\n\n' +
        'Threadkeeper is trying to use ContextKeeper directory.\n' +
        'THREADKEEPER_HOME=' + threadkeeperHome + '\n\n' +
        'Each project needs its own isolated directory.\n' +
        'Please set: THREADKEEPER_HOME=~/.threadkeeper\n'
      );
    }
  }

  /**
   * Generate info report for documentation
   */
  static generateReport() {
    const conflicts = this.detectConflicts();
    let report = '## Project Isolation Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += '### Detected Projects\n\n';

    if (conflicts.length === 0) {
      report += 'No other projects detected.\n';
    } else {
      report += '| Project | Directory | Size | Status |\n';
      report += '|---------|-----------|------|--------|\n';

      conflicts.forEach(c => {
        const status = c.project === 'threadkeeper' ? '✅ Current' : '⚠️ Other';
        report += `| ${c.project} | ${c.directory} | ${this.formatSize(c.sizeBytes)} | ${status} |\n`;
      });
    }

    return report;
  }
}
