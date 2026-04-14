# Quick Start: Threadkeeper

Get Threadkeeper running in 2 minutes.

## Step 1: Install

```bash
npx threadkeeper install
```

This sets up the hook in your Claude Code installation.

## Step 2: Test

```bash
npx threadkeeper test
```

You'll see:
- ✓ If you have past memories (from using Claude Code)
- The top relevant memories from your work

## Step 3: Use

Open a new Claude Code chat. Threadkeeper will automatically:
1. Detect you started a new session
2. Search your past work for relevant context
3. Inject the findings at the top

Look for:
```
---START_THREADKEEPER_CONTEXT---
RELEVANT CONTEXT FROM YOUR PREVIOUS WORK:
[Your memories here]
---END_THREADKEEPER_CONTEXT---
```

## That's It!

From now on, every new Claude Code session gets automatic context injection.

## How to Verify It's Working

1. Have at least one completed Claude Code session (so there are memories to find)
2. Start a new Claude Code chat
3. Look for the context block in the console
4. Notice Claude already knows about your past decisions/tech choices

## What If Nothing Appears?

This is normal if:
- You haven't completed any Claude Code sessions yet
- The chat topic doesn't match past work (try a more similar topic)
- Run `npx threadkeeper test` to debug

## Customize (Optional)

Create `~/.threadkeeper/config.json`:

```json
{
  "contextLimit": 3,
  "searchDepth": "moderate",
  "includeTypes": ["decision", "insight", "technology"]
}
```

## Need Help?

- **Not working?** Run `npx threadkeeper test` for diagnostics
- **Too much context?** Lower `contextLimit` in config
- **Wrong memories?** Threadkeeper uses keyword search; chat names matter
- **Report issues:** [GitHub Issues](https://github.com/threadkeeper/threadkeeper/issues)

---

**That's all.** Threadkeeper works in the background, automatically. No more manual context. No more forgotten decisions. Just seamless continuity across your Claude Code sessions.
