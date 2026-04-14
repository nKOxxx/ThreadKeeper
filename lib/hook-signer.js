/**
 * Hook Code Signing for Threadkeeper
 * Verifies integrity of SessionStart hook
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_HOOKS_DIR = join(homedir(), '.claude', 'hooks');
const HOOK_SIGNATURE_FILE = join(CLAUDE_HOOKS_DIR, '.session-start.sha256');

/**
 * Hook Signer Class
 */
export class HookSigner {
  /**
   * Calculate SHA256 hash of hook content
   */
  static calculateHash(content) {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Sign hook file (store its hash)
   */
  static signHook(hookPath) {
    try {
      const content = readFileSync(hookPath, 'utf8');
      const hash = this.calculateHash(content);

      // Store the signature
      writeFileSync(HOOK_SIGNATURE_FILE, hash, { mode: 0o600 });

      return {
        success: true,
        hash: hash,
        signatureFile: HOOK_SIGNATURE_FILE
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify hook file integrity
   */
  static verifyHook(hookPath) {
    try {
      if (!existsSync(HOOK_SIGNATURE_FILE)) {
        return {
          valid: false,
          reason: 'No signature file found. Hook may have been modified.'
        };
      }

      const content = readFileSync(hookPath, 'utf8');
      const currentHash = this.calculateHash(content);
      const storedHash = readFileSync(HOOK_SIGNATURE_FILE, 'utf8').trim();

      if (currentHash === storedHash) {
        return {
          valid: true,
          message: 'Hook file is intact'
        };
      } else {
        return {
          valid: false,
          reason: 'Hook file hash mismatch. File may have been modified.',
          expected: storedHash,
          actual: currentHash
        };
      }
    } catch (error) {
      return {
        valid: false,
        reason: `Verification error: ${error.message}`
      };
    }
  }

  /**
   * Get hook signature info
   */
  static getSignatureInfo() {
    try {
      if (!existsSync(HOOK_SIGNATURE_FILE)) {
        return null;
      }

      return {
        path: HOOK_SIGNATURE_FILE,
        hash: readFileSync(HOOK_SIGNATURE_FILE, 'utf8').trim()
      };
    } catch (error) {
      return null;
    }
  }
}

export default HookSigner;
