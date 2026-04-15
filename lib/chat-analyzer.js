/**
 * Chat Analyzer
 * Uses Claude API to intelligently summarize chats and extract insights
 * Replaces regex-based extraction with AI-powered understanding
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

export class ChatAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set');
    }
    this.anthropicBaseUrl = 'https://api.anthropic.com/v1';
  }

  /**
   * Analyze a chat JSONL file and extract key insights
   */
  async analyzeChatFile(chatJsonlPath) {
    try {
      // Read and parse the JSONL file
      const content = readFileSync(chatJsonlPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      if (lines.length === 0) {
        return [];
      }

      // Parse JSON lines and extract messages
      const messages = [];
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type && (entry.type === 'user' || entry.type === 'assistant') && entry.content) {
            messages.push({
              type: entry.type,
              content: entry.content,
              timestamp: entry.timestamp
            });
          }
        } catch (e) {
          // Skip malformed JSON lines
        }
      }

      if (messages.length === 0) {
        return [];
      }

      // Build a condensed chat summary (first 100 messages to stay under token limit)
      const recentMessages = messages.slice(-100);
      const chatText = recentMessages
        .map(m => `${m.type === 'user' ? 'User' : 'Claude'}: ${m.content}`)
        .join('\n\n');

      // Send to Claude for analysis
      const insights = await this.extractInsights(chatText);

      return insights;
    } catch (error) {
      console.error('Error analyzing chat file:', error);
      return [];
    }
  }

  /**
   * Use Claude to extract insights from chat text
   */
  async extractInsights(chatText) {
    const systemPrompt = `You are an expert at extracting key insights from chat conversations.
Analyze the following conversation and extract:

1. KEY DECISIONS - Important choices made (architecture, technology, approach)
2. ACHIEVEMENTS - Things built, completed, or solved
3. LEARNINGS - Important insights, lessons, or discoveries
4. TECHNOLOGIES - Specific tools, frameworks, or platforms mentioned

Return ONLY valid JSON with this structure:
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

    try {
      const response = await fetch(`${this.anthropicBaseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userMessage }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Claude API error:', error);
        return [];
      }

      const result = await response.json();
      const content = result.content[0].text;

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response:', content);
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
      console.error('Error calling Claude API:', error);
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
