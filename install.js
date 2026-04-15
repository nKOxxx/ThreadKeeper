#!/usr/bin/env node
/**
 * Threadkeeper Installer
 * Sets up the SessionStart hook for Claude Code
 */

import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import { ChatScreener } from './lib/chat-screener.js';
import { HookSigner } from './lib/hook-signer.js';
import { ProjectDetector } from './lib/project-detector.js';
import { MemoryExporter } from './lib/memory-exporter.js';

const CLAUDE_HOOKS_DIR = join(homedir(), '.claude', 'hooks');
const THREADKEEPER_HOOK_FILE = join(import.meta.url.replace('file://', ''), '..', 'hooks', 'session-start.js');

async function install() {
  console.log('\n🧵 Threadkeeper Installer\n');

  try {
    // Step 1: Check if Claude Code is installed
    console.log('✓ Checking Claude Code installation...');
    if (!existsSync(join(homedir(), '.claude'))) {
      console.error('❌ Claude Code not found. Please install Claude Code first.');
      process.exit(1);
    }

    // Step 1.5: Validate no project conflicts and warn about others
    ProjectDetector.validateConfiguration();
    ProjectDetector.warnOnInstall();

    // Step 2: Create hooks directory if it doesn't exist
    console.log('✓ Setting up hooks directory...');
    if (!existsSync(CLAUDE_HOOKS_DIR)) {
      mkdirSync(CLAUDE_HOOKS_DIR, { recursive: true });
      console.log(`  Created: ${CLAUDE_HOOKS_DIR}`);
    }

    // Step 3: Install SessionStart hook
    console.log('✓ Installing SessionStart hook...');
    const hookContent = `#!/usr/bin/env node
/**
 * Threadkeeper SessionStart Hook
 * Automatically injects context from previous Claude Code sessions
 */

import { execSync } from 'child_process';

try {
  // Run threadkeeper hook command
  const result = execSync('npx threadkeeper hook:session-start', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Output the result to be captured by Claude Code
  if (result) {
    process.stdout.write(result);
  }
  process.exit(0);
} catch (error) {
  // Gracefully handle if threadkeeper command fails
  process.stderr.write('[Threadkeeper] Hook execution failed: ' + error.message + '\\n');
  process.exit(0); // Don't fail the session if hook fails
}
`;

    const hookPath = join(CLAUDE_HOOKS_DIR, 'session-start.js');
    writeFileSync(hookPath, hookContent);
    execSync(`chmod +x ${hookPath}`);
    console.log(`  Installed: ${hookPath}`);

    // Sign hook for integrity verification
    const signResult = HookSigner.signHook(hookPath);
    if (signResult.success) {
      console.log(`  ✓ Hook signed for integrity verification`);
    }

    // Step 4: Install npm dependencies
    console.log('✓ Installing dependencies...');
    try {
      execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
    } catch (e) {
      console.log('  (Dependencies may already be installed)');
    }

    // Step 5: Screen existing chats for context
    console.log('✓ Screening existing chats for context...');
    const screener = new ChatScreener();
    const screeningResults = await screener.scanAllChats((message) => {
      console.log(`  ${message}`);
    });

    if (screeningResults.scanned > 0) {
      console.log(`\n  📊 Chat Screening Complete:`);
      console.log(`     • Scanned: ${screeningResults.scanned} chats`);
      console.log(`     • Context created: ${screeningResults.created} memories`);
      console.log(`     • Chats with context: ${screeningResults.withContext}`);

      if (screeningResults.securityReport) {
        const sec = screeningResults.securityReport;
        if (sec.sensitiveDetections > 0) {
          console.log(`\n  🔒 Security Filtering:`);
          console.log(`     • Sensitive data detected: ${sec.sensitiveDetections} times`);
          console.log(`     • Memories filtered: ${sec.filteredMemories}`);
          console.log(`     • Audit log: ${sec.auditLogPath}`);
        }
      }
      console.log('');
    } else {
      console.log('  (No existing chats found to screen)\n');
    }

    // Step 6: Verify installation
    console.log('✓ Verifying installation...');
    if (existsSync(hookPath)) {
      console.log(`  ✓ Hook file created: ${hookPath}`);
      console.log(`  ✓ Ready to use!`);
    }

    // Step 7: Show next steps
    console.log('\n✅ Threadkeeper installed successfully!\n');

    console.log('🔒 Security Reminder:\n');
    console.log('  Threadkeeper extracts context from your chats, including:');
    console.log('  • Decisions and code snippets');
    console.log('  • Technologies and tools used');
    console.log('  • Any text mentioning achievements\n');
    console.log('  ⚠️  WARNING: If your chats contain sensitive data');
    console.log('  (API keys, passwords, tokens), Threadkeeper will');
    console.log('  extract and filter them. We recommend:');
    console.log('  • Never paste credentials in Claude Code chats');
    console.log('  • Use environment variables and .env files instead\n');

    console.log('📋 Next steps:\n');
    console.log('  1. Start a new Claude Code session');
    console.log('  2. Run: threadkeeper inject "chat name"');
    console.log('  3. Copy the output into your new chat\n');
    const exporter = new MemoryExporter();
    console.log(`📁 Extracted insights: ${exporter.getExportPath()}/`);
    console.log('   (Each chat has its own folder with memories.json and insights.md)\n');
    console.log('🔐 Security logs: ~/.threadkeeper/audit-logs/');
    console.log('🔗 Documentation: https://github.com/threadkeeper/threadkeeper\n');

  } catch (error) {
    console.error('❌ Installation failed:', error.message);
    process.exit(1);
  }
}

install();
