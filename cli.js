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
      const { execSync } = await import('child_process');
      execSync('node hooks/session-start.js', {
        cwd: __dirname,
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('Hook execution failed:', error.message);
      process.exit(1);
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
  } else {
    console.error(`Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
  }
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

OPTIONS:
  --version, -v        Show version
  --help, -h          Show this help message

QUICK START:
  1. Install: threadkeeper install
  2. Test:    threadkeeper test
  3. Done! Open a new Claude Code chat.

DOCUMENTATION:
  README.md            Full documentation
  QUICKSTART.md        2-minute quick start guide
  LAUNCH.md            Launch information

For more info: https://github.com/threadkeeper/threadkeeper
  `);
}

main();
