/**
 * Threadkeeper
 * Automatic context persistence across Claude Code sessions
 */

export { ContextRetriever } from './lib/context-retriever.js';

export const version = '0.1.0';
export const name = 'threadkeeper';
export const description = 'Automatic context persistence across Claude Code sessions';

// Default export
export default {
  version,
  name,
  description,
  ContextRetriever
};
