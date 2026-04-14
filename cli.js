#!/usr/bin/env node
/**
 * Threadkeeper CLI
 * Main entry point for the Threadkeeper application
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(readFileSync(`${__dirname}/package.json`, 'utf-8'));

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    console.log(`Threadkeeper v${packageJson.version}`);
    process.exit(0);
  }

  if (command === 'install') {
    try {
      const { execSync } = await import('child_process');
      execSync('node install.js', {
        cwd: __dirname,
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('Installation failed:', error.message);
      process.exit(1);
    }
  } else if (command === 'hook:session-start') {
    try {
      const { ContextRetriever } = await import('./lib/context-retriever.js');

      // Initialize context retriever
      const retriever = new ContextRetriever();

      // Search for relevant past context using broad search terms
      // This ensures we find memories even if chat name isn't available
      const broadSearchTerms = 'decision implementation architecture technology';
      const relevantContext = await retriever.search(broadSearchTerms, { limit: 5 });

      if (relevantContext && relevantContext.length > 0) {
        // Format context for injection
        const contextBlock = formatContextBlock(relevantContext);
        if (contextBlock && contextBlock.trim()) {
          process.stdout.write(contextBlock);
        }
      }
      process.exit(0);
    } catch (error) {
      process.stderr.write('[Threadkeeper] Debug: ' + error.message + '\n');
      process.exit(0);
    }
  } else if (command === 'test') {
    try {
      const { ContextRetriever } = await import('./lib/context-retriever.js');

      console.log('\n🧵 Testing Threadkeeper\n');

      const retriever = new ContextRetriever();
      const results = await retriever.search('architecture decision implementation');

      if (results.length > 0) {
        console.log(`✓ Found ${results.length} relevant memories:\n`);
        results.forEach((r, i) => {
          console.log(`${i + 1}. [${r.content_type}] ${r.content.substring(0, 60)}...`);
          console.log(`   Relevance: ${r.relevanceScore}\n`);
        });
      } else {
        console.log('No memories found. This is normal if you haven\'t used Claude Code yet.\n');
      }
    } catch (error) {
      console.error('Test failed:', error.message);
      process.exit(1);
    }
  } else if (command === 'uninstall') {
    try {
      console.log('\n🧵 Threadkeeper Uninstaller\n');
      console.log('Run the uninstall script:');
      console.log('  bash uninstall.sh\n');
      console.log('Or manually remove:');
      console.log('  rm ~/.claude/hooks/session-start.js');
      console.log('  rm ~/.claude/hooks/.session-start.sha256');
      console.log('  rm -rf ~/.threadkeeper/\n');
      process.exit(0);
    } catch (error) {
      console.error('Uninstall failed:', error.message);
      process.exit(1);
    }
  } else if (command === 'info') {
    try {
      const { ProjectDetector } = await import('./lib/project-detector.js');
      console.log('\n🧵 Threadkeeper System Information\n');
      console.log(ProjectDetector.generateReport());
      process.exit(0);
    } catch (error) {
      console.error('Info command failed:', error.message);
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
  }
}

function formatContextBlock(memories) {
  const sections = {
    technologies: [],
    decisions: [],
    insights: [],
    achievements: [],
    problems: []
  };

  // Group memories by type
  memories.forEach(memory => {
    const type = memory.content_type || 'insight';
    if (sections[type]) {
      sections[type].push(memory.content);
    }
  });

  // Build formatted block
  let output = '\n[Threadkeeper] RELEVANT CONTEXT FROM YOUR PREVIOUS WORK:\n\n';

  if (sections.decisions.length > 0) {
    output += '📋 Key Decisions Made:\n';
    sections.decisions.forEach((d, i) => {
      output += `   ${i + 1}. ${d}\n`;
    });
    output += '\n';
  }

  if (sections.technologies.length > 0) {
    output += '🔧 Technologies & Tools Used:\n';
    sections.technologies.forEach((t, i) => {
      output += `   ${i + 1}. ${t}\n`;
    });
    output += '\n';
  }

  if (sections.achievements.length > 0) {
    output += '✅ Achievements:\n';
    sections.achievements.forEach((a, i) => {
      output += `   ${i + 1}. ${a}\n`;
    });
    output += '\n';
  }

  if (sections.insights.length > 0) {
    output += '💡 Key Insights:\n';
    sections.insights.forEach((i, idx) => {
      output += `   ${idx + 1}. ${i}\n`;
    });
    output += '\n';
  }

  if (sections.problems.length > 0) {
    output += '⚠️ Problems Solved:\n';
    sections.problems.forEach((p, i) => {
      output += `   ${i + 1}. ${p}\n`;
    });
    output += '\n';
  }

  return output;
}

function showHelp() {
  console.log(`
🧵 Threadkeeper v${packageJson.version}
Automatic context persistence across Claude Code sessions

USAGE:
  threadkeeper [command]

COMMANDS:
  install              Install Threadkeeper hook into Claude Code
  hook:session-start   Execute SessionStart hook (called by Claude Code)
  test                 Test Threadkeeper functionality
  info                 Show project isolation report
  uninstall            Show uninstall instructions

OPTIONS:
  --version, -v        Show version
  --help, -h          Show this help message

QUICK START:
  1. Install: threadkeeper install
  2. Test:    threadkeeper test
  3. Done! Open a new Claude Code chat.

PROJECT ISOLATION:
  Threadkeeper uses ~/.threadkeeper/ (separate from other projects)
  Other projects are automatically detected and reported
  See: threadkeeper info

DOCUMENTATION:
  README.md            Full documentation
  QUICKSTART.md        2-minute quick start guide
  SECURITY.md          Security features and threat model

For more info: https://github.com/threadkeeper/threadkeeper
  `);
}

main();
