# 🧵 Threadkeeper User Guide

**Complete guide to using Threadkeeper for automatic context persistence across Claude Code sessions.**

---

## Table of Contents

1. [What is Threadkeeper?](#what-is-threadkeeper)
2. [Installation](#installation)
3. [How It Works](#how-it-works)
4. [Usage Examples](#usage-examples)
5. [Configuration](#configuration)
6. [Security & Privacy](#security--privacy)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)
9. [Advanced Usage](#advanced-usage)

---

## What is Threadkeeper?

### The Problem

You're working on multiple Claude Code projects. You start a new session and realize:

- ❌ You forgot which database you chose last time
- ❌ You have to re-explain your authentication architecture
- ❌ You forgot what technologies you're using
- ❌ You lost the context of previous decisions

So you either:
1. Manually copy-paste summaries from old chats (tedious)
2. Re-explain everything from scratch (time-consuming)
3. Hope Claude remembers (unreliable)

### The Solution

**Threadkeeper automatically remembers your work for you.**

When you start a new Claude Code chat, Threadkeeper:
1. Finds relevant context from your previous work
2. Injects it into the new session automatically
3. You have full context without any manual effort

---

## Installation

### Quick Install

```bash
npx threadkeeper install
```

That's it! One command. No configuration needed.

### What Happens During Installation

1. ✅ Claude Code installation is verified
2. ✅ SessionStart hook is installed
3. ✅ Hook is cryptographically signed for security
4. ✅ All your existing chats are scanned
5. ✅ Context is extracted (decisions, technologies, achievements)
6. ✅ Baseline memories are created (~1,000+ memories)
7. ✅ Security filtering is applied to sensitive data
8. ✅ Audit logs are created

**Installation time:** ~30 seconds  
**Configuration required:** None

### Verify Installation

```bash
threadkeeper test
```

You should see output like:

```
🧵 Testing Threadkeeper

✓ Found 5 relevant memories:

1. [achievement] Successfully deployed authentication system
   Relevance: 10

2. [decision] Using JWT + Redis for sessions
   Relevance: 9

3. [technology] React with TypeScript
   Relevance: 8

...
```

---

## How It Works

### 1. On Installation

```
npx threadkeeper install
    ↓
Scans ~/.claude/projects/ for all your chats
    ↓
Reads JSONL session files
    ↓
Extracts: decisions, achievements, technologies, topics
    ↓
Filters: removes sensitive data (API keys, passwords)
    ↓
Stores: in local SQLite databases (~26 databases created)
    ↓
Logs: audit trail of all extractions
    ↓
Result: 1,276+ baseline memories ready
```

### 2. When You Start a New Session

```
User opens new Claude Code chat
    ↓
SessionStart hook fires automatically
    ↓
Threadkeeper searches your memories
    ↓
Finds relevant decisions, technologies, achievements
    ↓
Formats them nicely
    ↓
Injects into your chat context
    ↓
Claude sees: "Based on your previous work with..."
    ↓
You have full context without copy-pasting!
```

### 3. Search & Relevance

Threadkeeper uses **keyword-based search with relevance scoring**:

- Searches all your memory databases
- Extracts keywords from your new chat name/context
- Ranks results by relevance
- Injects top 5 memories (configurable)

**Performance:** <10ms per search (you won't notice it)

---

## Usage Examples

### Example 1: Returning to a Project

**Without Threadkeeper:**
```
You: "I'm building authentication"
Claude: "Sure! Tell me about your architecture..."
You: [Spend 5 minutes explaining JWT, Redis, session handling...]
Claude: "Got it, so JWT + Redis with..."
```

**With Threadkeeper:**
```
[Threadkeeper automatically injects:]
"Previous decision: JWT + Redis for sessions
 Technology: Express.js, Node.js"

You: "I'm building authentication"
Claude: "Perfect! Based on your previous JWT + Redis setup..."
[You skip 5 minutes of explanation]
```

### Example 2: Switching Between Projects

**Scenario:** You're working on Project A, take a break, then switch to Project B.

**What happens:**
1. You open a new Claude Code chat for "Project B"
2. Threadkeeper searches for memories mentioning "Project B"
3. Finds: Your tech stack, previous decisions, what you implemented
4. Injects them automatically
5. You have instant context without leaving the chat

### Example 3: Multiple Related Decisions

**Scenario:** You made several architecture decisions across multiple sessions.

**Result:**
- Session 1: "Decided to use Postgres for persistence"
- Session 2: "Decided to add Redis for caching"
- Session 3: "Decided to use Bull for job queues"

**When you start Session 4:**
- All three decisions are automatically injected
- Claude sees the full picture
- You build on previous decisions instead of explaining again

---

## Configuration

### Viewing Current Configuration

Check if a config file exists:

```bash
cat ~/.threadkeeper/config.json
```

### Creating Custom Configuration

Create `~/.threadkeeper/config.json`:

```json
{
  "contextLimit": 5,
  "searchDepth": "moderate",
  "includeTypes": ["decision", "insight", "technology", "achievement"],
  "excludePrivate": true,
  "encryptionEnabled": false,
  "auditLoggingEnabled": true
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `contextLimit` | number | 5 | How many memories to inject (1-10) |
| `searchDepth` | string | "moderate" | Search precision: "light", "moderate", or "deep" |
| `includeTypes` | array | All types | Which memory types to include |
| `excludePrivate` | boolean | true | Skip memories marked as private |
| `encryptionEnabled` | boolean | false | Encrypt memories at rest (v0.2+) |
| `auditLoggingEnabled` | boolean | true | Log all data operations |

### What Each Memory Type Means

**Decision** - Architectural/technology choices
- Example: "We decided to use PostgreSQL instead of MongoDB"
- Importance: 7/10

**Achievement** - What you successfully built
- Example: "Implemented JWT-based authentication system"
- Importance: 8/10

**Technology** - Tools and frameworks you use
- Example: "React", "Node.js", "Docker"
- Importance: 6/10

**Topic** - General conversation content
- Example: "Building real-time collaborative editing"
- Importance: 5/10

**Insight** - Key learnings and patterns
- Example: "Debouncing improves performance for large lists"
- Importance: 7/10

---

## Security & Privacy

### What Threadkeeper Collects

Threadkeeper extracts from your chats:
- ✅ Decisions and architecture choices
- ✅ Technologies and tools you mention
- ✅ Code snippets and implementations
- ✅ Topics you discuss
- ✅ Achievements and completed work

### What Threadkeeper Protects Against

✅ **Automatic Credential Filtering**
- Detects API keys, passwords, tokens
- Automatically redacts them: `password=secret` → `password=[REDACTED]`
- You're warned during installation

✅ **Audit Logging**
- Every data extraction is logged
- Location: `~/.threadkeeper/audit-logs/`
- You can review and delete anytime

✅ **Hook Integrity Verification**
- Hook file is digitally signed
- Prevents tampering
- Signature checked on each run

✅ **No Network Transmission**
- All data stays on your machine
- Nothing sent to servers
- You have full control

### Security Best Practices

⚠️ **IMPORTANT: Don't Paste Credentials in Chats**

Instead:
- Use `.env` files for environment variables
- Use password managers for secrets
- Use OAuth/SSO for third-party services
- Reference credentials in code, don't paste them

**If you do paste credentials:**
1. Threadkeeper will detect and filter them ✓
2. They'll be logged in audit trail ✓
3. Your filtered memory won't expose them ✓
4. But deletion is permanent - be careful!

### Reviewing Your Audit Log

```bash
# View your audit logs
cat ~/.threadkeeper/audit-logs/*.jsonl | jq .

# See what was filtered
grep "action.*filter" ~/.threadkeeper/audit-logs/*.jsonl | jq .

# Count detections
grep "action.*detect" ~/.threadkeeper/audit-logs/*.jsonl | wc -l
```

### Deleting Everything

```bash
# Remove all Threadkeeper data
rm -rf ~/.threadkeeper/
rm ~/.claude/hooks/session-start.js
rm ~/.claude/hooks/.session-start.sha256
```

---

## Troubleshooting

### "I installed but context isn't being injected"

**Check 1: Is the hook installed?**
```bash
ls -la ~/.claude/hooks/session-start.js
```

Should show: `-rwxr-xr-x ... session-start.js`

**Check 2: Do you have existing memories?**
```bash
threadkeeper test
```

If it finds 0 memories, you need more chat history to build a baseline.

**Check 3: Are the memories relevant?**
Context is only injected if it's relevant to your new chat. Try:
- Starting a chat with descriptive name
- Using keywords from your previous chats

### "Too much context being injected"

Reduce the limit in `~/.threadkeeper/config.json`:

```json
{
  "contextLimit": 2
}
```

### "I don't trust the security filtering"

You can disable automatic filtering (v0.1):
- Audit logs are still created
- You can review what would be extracted
- See "Reviewing Your Audit Log" above

### "Installation seems slow"

Installation scans all your existing chats. This can take a few seconds per chat:
- 1-5 chats: <10 seconds
- 5-10 chats: 10-30 seconds  
- 10+ chats: 30-60 seconds

This is normal and one-time only.

### "Help! I accidentally exposed a credential"

1. **Delete the memory:** Remove problematic memories from `~/.threadkeeper/data-lake/`
2. **Clear audit logs:** `rm ~/.threadkeeper/audit-logs/*`
3. **Rotate the credential:** Change password/API key in your actual service
4. **Reinstall:** `npx threadkeeper install` to rebuild baseline

---

## FAQ

### Q: Does Threadkeeper use AI/ML?

A: No. Threadkeeper uses simple keyword matching and relevance scoring. No ML, no training, no external services.

### Q: Will my context ever leave my machine?

A: No. Everything stays local. No cloud storage, no external APIs, no network transmission.

### Q: Can I use Threadkeeper on multiple machines?

A: No. Memory databases are local to `~/.threadkeeper/`. To use on multiple machines, you'd need to manually sync the folder (not recommended due to security).

### Q: What if I delete my chat history?

A: Threadkeeper keeps a separate copy in `~/.threadkeeper/`. Deleting chats won't affect your memories unless you manually delete the data-lake folder.

### Q: Is there a performance cost?

A: Negligible. Search takes <10ms. You won't notice it.

### Q: Can I search memories manually?

A: Not yet (coming in v0.2). For now, use `threadkeeper test` to see what's being found.

### Q: What about Claude Projects (vs Claude Code)?

A: Threadkeeper only works with Claude Code. Claude Projects are separate and not supported yet.

### Q: How do I uninstall?

```bash
rm ~/.claude/hooks/session-start.js
rm ~/.claude/hooks/.session-start.sha256
rm -rf ~/.threadkeeper/
```

### Q: Can I export my memories?

A: Not yet (v0.2 feature). Memories are stored in SQLite databases in `~/.threadkeeper/data-lake/`. You can query them directly if needed.

### Q: What happens if Claude Code updates?

A: Threadkeeper is independent. It just reads from the hook directory. Updates to Claude Code shouldn't affect Threadkeeper.

---

## Advanced Usage

### Manual Hook Testing

Run the hook directly:

```bash
npx threadkeeper hook:session-start
```

This shows what context would be injected (useful for debugging).

### Inspecting Memory Databases

View the structure:

```bash
# List memory databases
ls -la ~/.threadkeeper/data-lake/

# Query with sqlite3
sqlite3 ~/.threadkeeper/data-lake/memory--project-name/bridge.db

# See table schema
sqlite3 ~/.threadkeeper/data-lake/memory--project-name/bridge.db ".schema"

# View all memories
sqlite3 ~/.threadkeeper/data-lake/memory--project-name/bridge.db "SELECT * FROM memories LIMIT 10;"
```

### Clearing Old Memories

If you want to remove old memories and start fresh:

```bash
# Backup first (important!)
cp -r ~/.threadkeeper ~/.threadkeeper.backup

# Remove all memories
rm -rf ~/.threadkeeper/data-lake/*

# Reinstall to rebuild baseline
npx threadkeeper install
```

### Adjusting Search Behavior

In `~/.threadkeeper/config.json`:

```json
{
  "searchDepth": "deep",
  "contextLimit": 10
}
```

- **light:** Fast, fewer results (good for large memory bases)
- **moderate:** Balanced (default, recommended)
- **deep:** Comprehensive, slower (for small memory bases)

### Performance Monitoring

Check how long searches take:

```bash
# Run multiple tests and see timing
time threadkeeper test
```

Should consistently be <50ms (including formatting).

---

## Getting Help

### Check Documentation

- **README.md** - Overview and quick start
- **SECURITY.md** - Security features and threat model
- **QUICKSTART.md** - 2-minute setup guide
- **This guide** - Complete usage instructions

### Report Issues

GitHub: https://github.com/threadkeeper/threadkeeper/issues

Include:
- What you were trying to do
- What happened instead
- Output of `threadkeeper test`
- Output of `threadkeeper --help`

### Request Features

GitHub: https://github.com/threadkeeper/threadkeeper/discussions

Popular requests for v0.2:
- Semantic search (embeddings)
- Web dashboard for memory management
- Team sharing of memories
- IDE integrations (VS Code, Cursor)
- Memory export/import

---

## What's Coming in v0.2+

**v0.2 (Next Release):**
- ✅ Semantic similarity search (embeddings)
- ✅ Encryption at rest (AES-256)
- ✅ Web dashboard to browse memories
- ✅ Team sharing features
- ✅ Memory deduplication

**v0.3+:**
- 🔮 Knowledge graph visualization
- 🔮 IDE extensions (VS Code, Cursor)
- 🔮 Analytics and insights
- 🔮 Advanced memory management
- 🔮 Enterprise features

---

## Summary

**Threadkeeper solves context loss in Claude Code with:**

✅ **Automatic**: Install once, works forever  
✅ **Simple**: One command, zero config  
✅ **Secure**: Automatic credential filtering, audit logging  
✅ **Local**: All data stays on your machine  
✅ **Fast**: <10ms search, negligible performance impact  
✅ **Smart**: Relevant context injected automatically  

**Get started:**

```bash
npx threadkeeper install
```

**Verify it works:**

```bash
threadkeeper test
```

**Start a new Claude Code chat and watch it work automatically!**

---

Made for developers who want to remember their work. 🧵

Questions? Open an issue: https://github.com/threadkeeper/threadkeeper/issues
