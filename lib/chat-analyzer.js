/**
 * Chat Analyzer
 * Uses Claude CLI locally to intelligently summarize chats and extract insights
 * No API keys needed - uses the user's existing Claude CLI auth
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';

export class ChatAnalyzer {
  /**
   * Analyze a chat JSONL file and extract key insights using Claude CLI
   */
  async analyzeChatFile(chatJsonlPath) {
    try {
      // Read and parse the JSONL file
      const content = readFileSync(chatJsonlPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      if (lines.length === 0) {
        return [];
      }

      // Parse JSON lines and extract actual conversation messages
      const messages = [];
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          // Only include actual user/assistant conversation messages
          if (entry.type === 'user' || entry.type === 'assistant') {
            const text = this.extractMessageText(entry);
            if (text) {
              messages.push({
                type: entry.type,
                content: text,
                timestamp: entry.timestamp
              });
            }
          }
        } catch (e) {
          // Skip malformed JSON lines
        }
      }

      if (messages.length === 0) {
        return [];
      }

      // Build a condensed chat summary (last 100 messages to stay under token limit)
      const recentMessages = messages.slice(-100);
      const chatText = recentMessages
        .map(m => `${m.type === 'user' ? 'User' : 'Claude'}: ${m.content}`)
        .join('\n\n');

      // Send to Claude CLI for analysis
      const insights = await this.extractInsights(chatText);

      return insights;
    } catch (error) {
      console.error('Error analyzing chat file:', error);
      return [];
    }
  }

  /**
   * Extract text content from a JSONL entry's message field
   * Handles both string and array content formats
   */
  extractMessageText(entry) {
    const msg = entry.message;
    if (!msg) return null;

    // message.content can be a string or array of content blocks
    const content = msg.content;
    if (!content) return null;

    if (typeof content === 'string') {
      return content.trim() || null;
    }

    if (Array.isArray(content)) {
      const texts = content
        .filter(block => block.type === 'text' && block.text)
        .map(block => block.text);
      const joined = texts.join('\n').trim();
      return joined || null;
    }

    return null;
  }

  /**
   * Use Claude CLI to extract insights from chat text
   */
  async extractInsights(chatText) {
    const systemPrompt = `You are an expert at extracting key insights from chat conversations.
Analyze the following conversation and extract:

1. KEY DECISIONS - Important choices made (architecture, technology, approach)
2. ACHIEVEMENTS - Things built, completed, or solved
3. LEARNINGS - Important insights, lessons, or discoveries
4. TECHNOLOGIES - Specific tools, frameworks, or platforms mentioned

Return ONLY valid JSON with this structure (no markdown, no code blocks):
{
  "decisions": ["decision 1", "decision 2"],
  "achievements": ["achievement 1", "achievement 2"],
  "learnings": ["learning 1", "learning 2"],
  "technologies": ["tech1", "tech2"]
}

Requirements:
- Extract ACTUAL insights, not task metadata
- Ignore task notifications and metadata noise
- Each entry should be a clear, standalone statement
- Maximum 5 entries per category
- Focus on substantive content, not administrative details`;

    const userMessage = `Analyze this conversation and extract key insights:\n\n${chatText}`;
    const fullPrompt = `${systemPrompt}\n\n${userMessage}`;

    try {
      // Use Claude CLI with --print flag to invoke Claude locally
      // The user's existing Claude Code auth is used automatically
      const escapedPrompt = fullPrompt.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/\`/g, '\\`');

      const result = execSync(`claude --print "${escapedPrompt}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024
      });

      // Parse the JSON response (strip markdown code blocks if present)
      let jsonText = result;
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error('No JSON found in Claude CLI response:', result.substring(0, 200));
        return [];
      }

      const insights = JSON.parse(jsonMatch[0]);

      // Convert to memory format
      const memories = [];

      // Add decisions
      (insights.decisions || []).forEach(decision => {
        memories.push({
          id: randomUUID(),
          content: decision,
          content_type: 'decision',
          importance: 8
        });
      });

      // Add achievements
      (insights.achievements || []).forEach(achievement => {
        memories.push({
          id: randomUUID(),
          content: achievement,
          content_type: 'achievement',
          importance: 8
        });
      });

      // Add learnings
      (insights.learnings || []).forEach(learning => {
        memories.push({
          id: randomUUID(),
          content: learning,
          content_type: 'insight',
          importance: 7
        });
      });

      // Add technologies
      (insights.technologies || []).forEach(tech => {
        memories.push({
          id: randomUUID(),
          content: tech,
          content_type: 'technology',
          importance: 6
        });
      });

      return memories;
    } catch (error) {
      console.error('Error calling Claude CLI:', error.message);
      return [];
    }
  }

  /**
   * Find all chat JSONL files for a given chat
   */
  async findChatFiles(chatPath) {
    const fs = await import('fs');
    const files = [];

    try {
      const projectsPath = join(homedir(), '.claude', 'projects', chatPath);

      if (!fs.existsSync(projectsPath)) {
        return files;
      }

      // Find main chat file and subagent files
      const entries = fs.readdirSync(projectsPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.jsonl')) {
          files.push(join(projectsPath, entry.name));
        } else if (entry.isDirectory() && entry.name === 'subagents') {
          const subagentPath = join(projectsPath, 'subagents');
          const subagents = fs.readdirSync(subagentPath, { withFileTypes: true });
          for (const subagent of subagents) {
            if (subagent.isFile() && subagent.name.endsWith('.jsonl')) {
              files.push(join(subagentPath, subagent.name));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error finding chat files:', error);
    }

    return files;
  }
}
