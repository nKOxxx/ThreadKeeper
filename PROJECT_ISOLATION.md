# 🧵 Threadkeeper Project Isolation

## What is Project Isolation?

Project Isolation is a safety feature that prevents Threadkeeper from accidentally mixing with other memory/context tools on your system.

**Problem it solves:** When building tools that store data locally, it's easy to accidentally use the same directory for multiple projects, causing:
- Data corruption when both projects write simultaneously
- Loss of data when uninstalling one project
- Audit logs from different projects mixed together

**Solution:** Threadkeeper automatically:
1. Detects other projects on your system
2. Warns you during installation
3. Uses a completely separate directory (`~/.threadkeeper/`)
4. Prevents misconfiguration

---

## How It Works

### Automatic Detection

When you install Threadkeeper, it scans your system for other known projects:

```bash
$ threadkeeper install

✓ Checking Claude Code installation...

⚠️ DETECTED OTHER PROJECTS:

  • COGNEXIA
    Path: ~/.cognexia (3.2MB data)
    Cognexia - General semantic memory system
    ℹ️  Uses separate data directory

✅ Threadkeeper uses ~/.threadkeeper/ (completely separate)
```

### Validation

Threadkeeper prevents misconfiguration by checking:

```javascript
// If someone tries to set THREADKEEPER_HOME=~/.cognexia
const threadkeeperHome = process.env.THREADKEEPER_HOME;
if (threadkeeperHome.includes('cognexia')) {
  throw new Error('Threadkeeper must use its own directory');
}
```

### Project Report

Get a report of all projects on your system:

```bash
$ threadkeeper info

🧵 Threadkeeper System Information

## Project Isolation Report

Generated: 2026-04-14T13:52:00Z

### Detected Projects

| Project | Directory | Size | Status |
|---------|-----------|------|--------|
| threadkeeper | ~/.threadkeeper | 2.1MB | ✅ Current |
| cognexia | ~/.cognexia | 3.2MB | ⚠️ Other |
```

---

## Data Locations

### Threadkeeper
```
~/.threadkeeper/
├── data-lake/           # SQLite memory databases
│   ├── memory--Users-nikolastojanow-Desktop-claude/
│   │   └── bridge.db
│   └── ...
├── audit-logs/          # JSONL security audit logs
│   ├── audit-1776151612145.jsonl
│   └── ...
└── .encryption-key      # Optional AES-256 encryption key
```

### Other Projects
```
~/.cognexia/            # Cognexia data (NOT touched by Threadkeeper)
~/.contextkeeper/       # ContextKeeper data (if installed)
~/.memorykeeper/        # MemoryKeeper data (if installed)
```

---

## Safe Uninstallation

### Using the Uninstall Script

The safest way to remove Threadkeeper:

```bash
bash uninstall.sh
```

This script:
1. ✅ Removes the SessionStart hook
2. ✅ Checks for other projects
3. ✅ Asks before deleting Threadkeeper data
4. ✅ Preserves other projects' data

### Manual Uninstallation

If you prefer manual removal:

```bash
# Remove the hook
rm ~/.claude/hooks/session-start.js
rm ~/.claude/hooks/.session-start.sha256

# Optionally remove Threadkeeper memories (⚠️ cannot be undone)
rm -rf ~/.threadkeeper/
```

---

## Preventing Project Mixing

### For Project Developers

If you're building a tool similar to Threadkeeper, follow this pattern:

**❌ DON'T:**
```javascript
const DATA_DIR = join(homedir(), '.cognexia', 'data-lake');
// Hardcoded = risk of mixing projects
```

**✅ DO:**
```javascript
const PROJECT_NAME = 'mythool';
const DATA_DIR = join(homedir(), `.${PROJECT_NAME}`, 'data-lake');
// Or use environment variable:
const DATA_DIR = process.env.MYTHOOL_HOME || 
                 join(homedir(), `.${PROJECT_NAME}`, 'data-lake');
```

### For Users

If you have multiple memory/context tools:

1. **Keep them separate** - Each should use its own directory
2. **Document locations** - Know where each stores data
3. **Uninstall safely** - Use provided uninstall scripts
4. **Back up important data** - Before uninstalling any tool

---

## Known Projects

Threadkeeper automatically detects these projects:

| Project | Directory | Description |
|---------|-----------|-------------|
| Threadkeeper | `~/.threadkeeper/` | Claude Code context persistence |
| Cognexia | `~/.cognexia/` | General semantic memory system |
| ContextKeeper | `~/.contextkeeper/` | Context persistence tool |
| MemoryKeeper | `~/.memorykeeper/` | Memory management tool |

If you use other memory/context tools, you can add them to the detection list by opening a GitHub issue.

---

## Troubleshooting

### "Found other projects during installation"

This is just a warning. Threadkeeper uses `~/.threadkeeper/` which is completely separate from other projects. You can safely use multiple memory tools.

### "Threadkeeper is trying to use the wrong directory"

If you see this error:
```
Threadkeeper is trying to use Cognexia directory.
THREADKEEPER_HOME=~/.cognexia
```

Fix it by unsetting the environment variable:
```bash
unset THREADKEEPER_HOME
threadkeeper install
```

### "I accidentally deleted both projects' data"

If you deleted `~/.cognexia/` intending only to remove Threadkeeper:

1. Threadkeeper data was in `~/.threadkeeper/` (NOT affected)
2. Cognexia data in `~/.cognexia/` was deleted
3. Restore from backup if available
4. Use `threadkeeper info` to verify project boundaries in the future

---

## FAQ

**Q: Can I use Threadkeeper with Cognexia?**  
A: Yes! They're completely separate. Threadkeeper uses `~/.threadkeeper/`, Cognexia uses `~/.cognexia/`.

**Q: What if I want to move Threadkeeper to a different directory?**  
A: Set the environment variable before installing:
```bash
export THREADKEEPER_HOME=~/.custom-threadkeeper
threadkeeper install
```

**Q: Will Threadkeeper data affect other projects?**  
A: No. Threadkeeper uses a completely isolated directory structure.

**Q: How do I back up Threadkeeper data?**  
A: Copy the directory:
```bash
cp -r ~/.threadkeeper ~/.threadkeeper.backup
```

**Q: Can I sync Threadkeeper between machines?**  
A: Yes, manually copy `~/.threadkeeper/` to another machine. Note: encryption keys won't match, so restore the directory with caution.

---

## See Also

- [SECURITY.md](./SECURITY.md) - Security features
- [USER_GUIDE.md](./USER_GUIDE.md) - Complete user guide
- [uninstall.sh](./uninstall.sh) - Safe uninstall script
