/**
 * Security Filter for Threadkeeper
 * Detects and filters sensitive data from extracted memories
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const AUDIT_LOG_DIR = join(homedir(), '.threadkeeper', 'audit-logs');
const ENCRYPTION_KEY_FILE = join(homedir(), '.threadkeeper', '.encryption-key');

/**
 * Sensitive data patterns to detect
 */
const SENSITIVE_PATTERNS = {
  // API Keys and tokens
  apiKey: /api[_-]?key\s*[:=]\s*['"]?([a-zA-Z0-9_\-]+)['"]?/gi,
  bearerToken: /bearer\s+([a-zA-Z0-9_\-\.]+)/gi,
  jwtToken: /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+/gi,

  // Passwords and secrets
  password: /password\s*[:=]\s*['"]?([^\s'"]+)['"]?/gi,
  secret: /secret\s*[:=]\s*['"]?([^\s'"]+)['"]?/gi,
  apiSecret: /api[_-]?secret\s*[:=]\s*['"]?([a-zA-Z0-9_\-]+)['"]?/gi,

  // Database credentials
  dbPassword: /db[_-]?password\s*[:=]\s*['"]?([^\s'"]+)['"]?/gi,
  connectionString: /mongodb\+srv:\/\/[^@]*@|postgresql:\/\/[^@]*@|mysql:\/\/[^@]*@/gi,

  // Credit cards
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

  // SSH and private keys
  privateKey: /-----BEGIN (RSA|EC|OPENSSH)? PRIVATE KEY-----[\s\S]*?-----END (RSA|EC|OPENSSH)? PRIVATE KEY-----/gi,

  // AWS credentials
  awsAccessKey: /AKIA[0-9A-Z]{16}/g,
  awsSecretKey: /aws_secret_access_key\s*[:=]\s*['"]?([a-zA-Z0-9_\-/+]+)['"]?/gi,

  // OAuth tokens
  oauthToken: /oauth[_-]?token\s*[:=]\s*['"]?([a-zA-Z0-9_\-\.]+)['"]?/gi,

  // Environment variable assignments with sensitive values
  envSensitive: /(DATABASE_URL|AUTH_TOKEN|API_KEY|SECRET_KEY|PRIVATE_KEY|PASSWORD)\s*[:=]\s*['"]?([^\s'"]+)['"]?/gi,
};

/**
 * Security Filter Class
 */
export class SecurityFilter {
  constructor() {
    this.auditLog = [];
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  /**
   * Get or create encryption key for memory storage
   */
  getOrCreateEncryptionKey() {
    try {
      if (existsSync(ENCRYPTION_KEY_FILE)) {
        const keyData = readFileSync(ENCRYPTION_KEY_FILE, 'utf8');
        return Buffer.from(keyData, 'hex');
      }

      // Create new 32-byte key for AES-256
      const key = randomBytes(32);
      const keyHex = key.toString('hex');

      // Store key (be careful with permissions)
      writeFileSync(ENCRYPTION_KEY_FILE, keyHex, { mode: 0o600 });

      return key;
    } catch (error) {
      console.error('Error managing encryption key:', error.message);
      // Fall back to derivable key (less secure but functional)
      return createHash('sha256').update('threadkeeper-default-key').digest();
    }
  }

  /**
   * Detect if content contains sensitive data
   */
  detectSensitiveData(content) {
    const findings = [];

    for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
      if (pattern.test(content)) {
        findings.push(type);
        // Reset regex for next test
        pattern.lastIndex = 0;
      }
    }

    return findings;
  }

  /**
   * Filter sensitive data from content
   */
  filterSensitiveData(content) {
    let filtered = content;
    let replacementCount = 0;

    for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
      const matches = filtered.match(pattern);
      if (matches) {
        replacementCount += matches.length;
        filtered = filtered.replace(pattern, `[REDACTED-${type.toUpperCase()}]`);
      }
    }

    return { filtered, replacementCount };
  }

  /**
   * Encrypt content for secure storage
   */
  encrypt(content) {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv('aes-256-cbc', this.encryptionKey, iv);

      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Return IV + encrypted content (both needed for decryption)
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error.message);
      return content; // Fallback: return unencrypted
    }
  }

  /**
   * Decrypt content from secure storage
   */
  decrypt(encryptedContent) {
    try {
      const [ivHex, encrypted] = encryptedContent.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv('aes-256-cbc', this.encryptionKey, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      return encryptedContent; // Fallback: return original
    }
  }

  /**
   * Process memory for security (detect, filter, encrypt if needed)
   */
  processMemory(memory, options = {}) {
    const {
      encrypt: shouldEncrypt = false,
      detectOnly = false,
      userConfirm = null
    } = options;

    const findings = this.detectSensitiveData(memory.content);

    // Log the finding
    this.addAuditEntry({
      timestamp: new Date().toISOString(),
      action: 'detect',
      memory_id: memory.id,
      memory_type: memory.content_type,
      sensitive_types: findings,
      content_preview: memory.content.slice(0, 50),
      project: memory.project
    });

    if (findings.length === 0) {
      // No sensitive data - optionally encrypt anyway
      if (shouldEncrypt) {
        memory.content = this.encrypt(memory.content);
        memory.encrypted = true;
      }
      return { memory, action: 'accepted', findings: [] };
    }

    // Found sensitive data
    if (detectOnly) {
      return { memory, action: 'detected', findings };
    }

    // Filter the sensitive data
    const { filtered, replacementCount } = this.filterSensitiveData(memory.content);

    this.addAuditEntry({
      timestamp: new Date().toISOString(),
      action: 'filter',
      memory_id: memory.id,
      replacements: replacementCount,
      sensitive_types: findings
    });

    // Update memory with filtered content
    memory.content = filtered;
    memory.filtered = true;
    memory.original_had_sensitive = findings;

    // Encrypt filtered content
    if (shouldEncrypt) {
      memory.content = this.encrypt(memory.content);
      memory.encrypted = true;
    }

    return { memory, action: 'filtered', findings };
  }

  /**
   * Add entry to audit log
   */
  addAuditEntry(entry) {
    this.auditLog.push(entry);

    // Periodically flush to disk
    if (this.auditLog.length >= 10) {
      this.flushAuditLog();
    }
  }

  /**
   * Flush audit log to disk
   */
  flushAuditLog() {
    if (this.auditLog.length === 0) return;

    try {
      if (!existsSync(AUDIT_LOG_DIR)) {
        mkdirSync(AUDIT_LOG_DIR, { recursive: true });
      }

      const logFile = join(AUDIT_LOG_DIR, `audit-${Date.now()}.jsonl`);
      const logContent = this.auditLog
        .map(entry => JSON.stringify(entry))
        .join('\n');

      writeFileSync(logFile, logContent);
      this.auditLog = [];
    } catch (error) {
      console.error('Error flushing audit log:', error.message);
    }
  }

  /**
   * Generate security report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_entries: this.auditLog.length,
        sensitive_detections: this.auditLog.filter(e => e.action === 'detect').length,
        filtered_memories: this.auditLog.filter(e => e.action === 'filter').length,
        sensitive_types: [...new Set(
          this.auditLog
            .filter(e => e.sensitive_types)
            .flatMap(e => e.sensitive_types)
        )]
      },
      recent_entries: this.auditLog.slice(-10)
    };

    return report;
  }

  /**
   * Get audit log path
   */
  getAuditLogPath() {
    return AUDIT_LOG_DIR;
  }
}

export default SecurityFilter;
