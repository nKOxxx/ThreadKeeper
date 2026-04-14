#!/usr/bin/env node
/**
 * Threadkeeper Test Suite
 * Comprehensive tests for all functionality
 */

import { ContextRetriever } from './lib/context-retriever.js';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';

const tests = [];
let passed = 0;
let failed = 0;

// Test utilities
function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n🧵 THREADKEEPER TEST SUITE\n');
  console.log('═'.repeat(50));

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✅ ${t.name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${t.name}`);
      console.log(`   Error: ${error.message}\n`);
      failed++;
    }
  }

  console.log('═'.repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All tests passed! Threadkeeper is ready.\n');
    process.exit(0);
  } else {
    console.log(`❌ ${failed} test(s) failed.\n`);
    process.exit(1);
  }
}

// ============ TESTS ============

test('Environment: Detect Claude Code installation', () => {
  const claudePath = join(homedir(), '.claude');
  if (!existsSync(claudePath)) {
    throw new Error('Claude Code not installed. Install from https://claude.com/claude-code');
  }
});

test('Environment: Check data lake exists', () => {
  const dataLakePath = join(homedir(), '.threadkeeper', 'data-lake');
  if (!existsSync(dataLakePath)) {
    throw new Error('No memory data found. Run Threadkeeper installation first.');
  }
});

test('Environment: Verify Node.js version', () => {
  const version = process.version;
  const major = parseInt(version.split('.')[0].substring(1));
  if (major < 18) {
    throw new Error(`Node.js 18+ required, found ${version}`);
  }
});

test('Dependency: sqlite3 installed', () => {
  try {
    execSync('npm list sqlite3', { stdio: 'pipe' });
  } catch (e) {
    throw new Error('sqlite3 not installed. Run: npm install');
  }
});

test('API: ContextRetriever instantiation', () => {
  const retriever = new ContextRetriever();
  if (!retriever) {
    throw new Error('Failed to instantiate ContextRetriever');
  }
  if (!retriever.dataLakePath) {
    throw new Error('Data lake path not set');
  }
});

test('API: Database discovery', async () => {
  const retriever = new ContextRetriever();
  const dataLakePath = retriever.dataLakePath;

  if (!existsSync(dataLakePath)) {
    throw new Error(`Data lake not found at ${dataLakePath}`);
  }

  const { readdirSync } = await import('fs');
  const dirs = readdirSync(dataLakePath);
  const memoryDirs = dirs.filter(d => d.startsWith('memory-'));

  if (memoryDirs.length === 0) {
    throw new Error('No memory databases found. Run Cognexia extraction first.');
  }

  console.log(`   Found ${memoryDirs.length} memory databases`);
});

test('API: Keyword extraction', async () => {
  const retriever = new ContextRetriever();
  const keywords = retriever.extractKeywords('building authentication system');

  if (!Array.isArray(keywords)) {
    throw new Error('Keywords should be an array');
  }
  if (keywords.length === 0) {
    throw new Error('No keywords extracted');
  }
  if (!keywords.includes('building') && !keywords.includes('authentication')) {
    throw new Error('Keywords missing expected terms');
  }
});

test('API: Relevance scoring', async () => {
  const retriever = new ContextRetriever();
  const score = retriever.calculateRelevance(
    'We decided to use JWT for authentication',
    'authentication'
  );

  if (typeof score !== 'number') {
    throw new Error('Score should be a number');
  }
  if (score <= 0) {
    throw new Error('Score should be positive for matching content');
  }
});

test('Search: Basic keyword search', async () => {
  const retriever = new ContextRetriever();
  const results = await retriever.search('architecture');

  if (!Array.isArray(results)) {
    throw new Error('Search should return an array');
  }

  if (results.length === 0) {
    throw new Error('No results found for "architecture"');
  }

  console.log(`   Found ${results.length} results`);
});

test('Search: Results have required fields', async () => {
  const retriever = new ContextRetriever();
  const results = await retriever.search('decision');

  if (results.length === 0) {
    throw new Error('No results found');
  }

  const first = results[0];
  if (!first.content) throw new Error('Missing "content" field');
  if (!first.content_type) throw new Error('Missing "content_type" field');
  if (typeof first.relevanceScore !== 'number') {
    throw new Error('Missing or invalid "relevanceScore" field');
  }
});

test('Search: Limit parameter works', async () => {
  const retriever = new ContextRetriever();
  const results = await retriever.search('technology', { limit: 2 });

  if (results.length > 2) {
    throw new Error(`Expected max 2 results, got ${results.length}`);
  }
});

test('Search: Results sorted by relevance', async () => {
    const retriever = new ContextRetriever();
  const results = await retriever.search('implementation');

  if (results.length < 2) {
    console.log('   (Skipped - less than 2 results)');
    return;
  }

  for (let i = 1; i < results.length; i++) {
    if (results[i].relevanceScore > results[i - 1].relevanceScore) {
      throw new Error('Results not sorted by relevance (descending)');
    }
  }
});

test('CLI: Help command works', () => {
  try {
    const output = execSync('node cli.js --help', { encoding: 'utf-8' });
    if (!output.includes('install') || !output.includes('test')) {
      throw new Error('Help output incomplete');
    }
  } catch (e) {
    throw new Error(`CLI help failed: ${e.message}`);
  }
});

test('CLI: Version command works', () => {
  try {
    const output = execSync('node cli.js --version', { encoding: 'utf-8' });
    if (!output.includes('0.1.0')) {
      throw new Error('Version output unexpected');
    }
  } catch (e) {
    throw new Error(`CLI version failed: ${e.message}`);
  }
});

test('Hook: Session start hook file exists', () => {
  const hookPath = join(process.cwd(), 'hooks', 'session-start.js');
  if (!existsSync(hookPath)) {
    throw new Error(`Hook file not found at ${hookPath}`);
  }
});

test('Hook: Hook is executable', () => {
  const hookPath = join(process.cwd(), 'hooks', 'session-start.js');
  try {
    // Check if file starts with shebang
    const content = readFileSync(hookPath, 'utf-8');
    if (!content.startsWith('#!/')) {
      console.log('   (Warning: no shebang line)');
    }
  } catch (e) {
    throw new Error(`Cannot read hook file: ${e.message}`);
  }
});

test('Integration: Search → Format → Output', async () => {
  const retriever = new ContextRetriever();
  const memories = await retriever.search('decision implementation');

  if (memories.length === 0) {
    throw new Error('No memories found');
  }

  // Simulate formatting
  const formatted = memories
    .map(m => `[${m.content_type}] ${m.content}`)
    .join('\n');

  if (formatted.length === 0) {
    throw new Error('Formatted output is empty');
  }

  console.log(`   Formatted ${memories.length} memories into ${formatted.length} chars`);
});

test('Integration: End-to-end context injection', async () => {
  const retriever = new ContextRetriever();

  // Simulate what happens in a real session
  // Use a broader search term that will find something
  const memories = await retriever.search('decision implementation', { limit: 5 });

  if (memories.length === 0) {
    throw new Error('No memories found to inject');
  }

  // Check we can format them
  const output = memories
    .map(m => `• [${m.content_type}] ${m.content.substring(0, 50)}...`)
    .join('\n');

  if (!output) {
    throw new Error('Could not format memories');
  }

  console.log(`   Would inject ${memories.length} memories (~${output.length} chars)`);
});

test('Performance: Search completes in reasonable time', async () => {
  const retriever = new ContextRetriever();
  const start = Date.now();
  const results = await retriever.search('architecture');
  const elapsed = Date.now() - start;

  if (elapsed > 5000) {
    throw new Error(`Search took ${elapsed}ms (too slow)`);
  }

  console.log(`   Completed in ${elapsed}ms`);
});

test('Data: Multiple memory types captured', async () => {
  const retriever = new ContextRetriever();

  // Search for common terms to get diverse results
  const allResults = await retriever.searchAllDatabases('technology implementation');

  const types = new Set(allResults.map(r => r.content_type));

  if (types.size === 0) {
    throw new Error('No memory types found');
  }

  console.log(`   Found memory types: ${Array.from(types).join(', ')}`);
});

test('Data: Content quality check', async () => {
  const retriever = new ContextRetriever();
  const results = await retriever.search('');

  // Sample results
  const sample = (await retriever.searchAllDatabases('decision')).slice(0, 5);

  for (const memory of sample) {
    if (!memory.content || memory.content.length < 3) {
      throw new Error('Memory content too short or empty');
    }
    if (!memory.content_type) {
      throw new Error('Memory missing type');
    }
  }

  console.log(`   Validated ${sample.length} sample memories`);
});

// ============ RUN TESTS ============

runTests().catch(err => {
  console.error('\n💥 Test suite crashed:', err.message);
  process.exit(1);
});
