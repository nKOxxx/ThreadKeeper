#!/bin/bash
#
# Threadkeeper Uninstaller
# Safely removes Threadkeeper while preserving other projects' data
#

set -e

echo ""
echo "🧵 Threadkeeper Uninstaller"
echo "================================"
echo ""

# Step 1: Remove hook
echo "✓ Removing SessionStart hook..."
rm -f ~/.claude/hooks/session-start.js
rm -f ~/.claude/hooks/.session-start.sha256
echo "  Removed: ~/.claude/hooks/session-start.js"

# Step 2: Check for memory data
if [ -d ~/.threadkeeper ]; then
  THREADKEEPER_SIZE=$(du -sh ~/.threadkeeper 2>/dev/null | cut -f1)
  echo ""
  echo "Found Threadkeeper memory data: $THREADKEEPER_SIZE"
  echo ""
  echo "Your Threadkeeper memories include:"
  if [ -d ~/.threadkeeper/data-lake ]; then
    MEMORY_COUNT=$(find ~/.threadkeeper/data-lake -name "*.db" 2>/dev/null | wc -l)
    echo "  • $MEMORY_COUNT memory databases"
  fi
  if [ -d ~/.threadkeeper/audit-logs ]; then
    AUDIT_COUNT=$(find ~/.threadkeeper/audit-logs -name "*.jsonl" 2>/dev/null | wc -l)
    echo "  • $AUDIT_COUNT audit log files"
  fi
  echo ""
  read -p "Delete Threadkeeper memories? (y/N) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Removing ~/.threadkeeper/..."
    rm -rf ~/.threadkeeper/
    echo "✅ Threadkeeper data deleted"
  else
    echo "✅ Threadkeeper data preserved at ~/.threadkeeper/"
  fi
else
  echo "✓ No Threadkeeper data found"
fi

# Step 3: Check for other projects
echo ""
echo "Checking for other projects..."

OTHER_PROJECTS=0
for dir in ~/.cognexia ~/.contextkeeper ~/.memorykeeper; do
  if [ -d "$dir" ]; then
    PROJECT_NAME=$(basename "$dir")
    SIZE=$(du -sh "$dir" 2>/dev/null | cut -f1)
    echo "  ℹ️  Found: $PROJECT_NAME ($SIZE)"
    OTHER_PROJECTS=$((OTHER_PROJECTS + 1))
  fi
done

if [ $OTHER_PROJECTS -eq 0 ]; then
  echo "  ✓ No other projects detected"
fi

echo ""
echo "✅ Threadkeeper uninstalled successfully!"
echo ""
echo "To reinstall:"
echo "  npm install -g github:nKOxxx/ThreadKeeper"
echo ""
