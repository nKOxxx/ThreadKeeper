#!/usr/bin/env node
/**
 * Threadkeeper SessionStart Hook
 * Fires when a new Claude Code session begins
 * Automatically injects relevant context from previous sessions
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { ContextRetriever } from '../lib/context-retriever.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function onSessionStart() {
  try {
    // Get the current chat context from environment or hook parameters
    const chatName = process.env.CLAUDE_CHAT_NAME || 'Unnamed Chat';
    const chatId = process.env.CLAUDE_CHAT_ID || null;

    console.log(`[Threadkeeper] Starting new session: ${chatName}`);

    // Initialize context retriever
    const retriever = new ContextRetriever();

    // Search for relevant past context
    console.log(`[Threadkeeper] Searching for relevant context...`);
    const relevantContext = await retriever.search(chatName, { limit: 5 });

    if (relevantContext && relevantContext.length > 0) {
      // Format context for injection
      const contextBlock = formatContextBlock(relevantContext);

      // Output context to be injected into system prompt
      console.log(`[Threadkeeper] Found ${relevantContext.length} relevant memories`);
      console.log('\n---START_THREADKEEPER_CONTEXT---');
      console.log(contextBlock);
      console.log('---END_THREADKEEPER_CONTEXT---\n');

      // Store injection metadata
      process.env.THREADKEEPER_INJECTED = 'true';
      process.env.THREADKEEPER_CONTEXT_COUNT = relevantContext.length;
    } else {
      console.log(`[Threadkeeper] No relevant past context found. Starting fresh.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('[Threadkeeper] Error in SessionStart hook:', error.message);
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
  let output = 'RELEVANT CONTEXT FROM YOUR PREVIOUS WORK:\n\n';

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

  if (sections.insights.length > 0) {
    output += '💡 Key Insights:\n';
    sections.insights.forEach((i, idx) => {
      output += `   ${idx + 1}. ${i}\n`;
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

  if (sections.problems.length > 0) {
    output += '⚠️ Problems Solved:\n';
    sections.problems.forEach((p, i) => {
      output += `   ${i + 1}. ${p}\n`;
    });
    output += '\n';
  }

  return output;
}

// Run the hook
onSessionStart();
