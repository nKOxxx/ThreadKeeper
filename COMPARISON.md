# Threadkeeper vs Claude-Mem

Head-to-head comparison of two context persistence solutions for Claude Code.

---

## Quick Overview

| | **Threadkeeper** | **Claude-Mem** |
|---|---|---|
| **Focus** | Auto-inject context into new chats | Comprehensive memory management |
| **Setup** | 1 command (`npx threadkeeper install`) | More complex installation |
| **Search** | Keyword matching (fast) | Chroma embeddings (semantic) |
| **Context Injection** | Silent/automatic | In system prompt |
| **Storage** | SQLite (local) | SQLite + Chroma (local) |
| **UI** | CLI only | Web dashboard (port 37777) |
| **Configuration** | Optional JSON | Required setup |
| **Privacy** | Local only | Local only |
| **Status** | **Just launched** | **Established** |

---

## Detailed Comparison

### 1. Installation & Setup

**Threadkeeper:**
```bash
npx threadkeeper install
```
- One command
- Automatically detects Claude Code
- Creates hook in ~/.claude/hooks
- ✅ Zero configuration needed

**Claude-Mem:**
- More complex installation process
- Requires configuration setup
- Needs environment variable setup
- Multiple hook files to configure
- ⚠️ Steeper learning curve

**Winner: Threadkeeper** (simpler, faster)

---

### 2. Search Capabilities

**Threadkeeper:**
- Keyword matching
- Fast (regex-based search)
- Works out of the box
- Good for obvious patterns
- Limited semantic understanding

**Claude-Mem:**
- Semantic embeddings (Chroma)
- Understands meaning, not just keywords
- Better for nuanced/implicit matches
- Slower but more intelligent
- 10x token efficiency (claimed)

**Winner: Claude-Mem** (smarter search)

---

### 3. Context Injection

**Threadkeeper:**
- Fires on SessionStart
- Injects top 5 memories silently
- Formatted as readable text
- Claude sees context in system prompt
- Non-intrusive

**Claude-Mem:**
- 3-layer search workflow
- Compact indexes → timeline → detailed
- Progressive disclosure pattern
- More token-efficient
- More complex

**Winner: Claude-Mem** (more sophisticated)

---

### 4. User Experience

**Threadkeeper:**
```
New chat → [silent context injection] → Continue work
```
- No action required
- Just works
- Minimal UI
- CLI-only
- Seamless

**Claude-Mem:**
```
New chat → [search + retrieve] → Web dashboard visible → Continue work
```
- More visible process
- Dashboard shows what was found
- Better for understanding system
- More transparent
- Heavier

**Winner: Threadkeeper** (seamless), Claude-Mem (transparent)

---

### 5. Architecture

**Threadkeeper:**
```
SessionStart Hook
    ↓
ContextRetriever searches SQLite
    ↓
Formats 5 relevant memories
    ↓
Injects into chat context
```
- Simple, focused
- Single responsibility
- Easy to understand
- Lightweight

**Claude-Mem:**
```
5 Lifecycle Hooks (SessionStart, UserPromptSubmit, PostToolUse, etc)
    ↓
Captures observations at each point
    ↓
Stores in SQLite + Chroma
    ↓
3-layer search workflow
    ↓
Injects context intelligently
```
- Comprehensive
- Captures more data
- More hooks = more context
- Heavier, more complex

**Winner: Threadkeeper** (simplicity), Claude-Mem (comprehensiveness)

---

### 6. What They Capture

**Threadkeeper:**
- Past decisions
- Technologies used
- Insights from conversations
- Achievements/implementations
- Problems solved

**Claude-Mem:**
- Tool usage observations
- Command outputs
- Conversation context
- User prompts
- System responses
- Generated summaries

**Winner: Claude-Mem** (captures more)

---

### 7. Privacy & Data

**Both:**
- ✅ Local only
- ✅ No external servers
- ✅ Your data stays on your machine
- ✅ No tracking

**Threadkeeper:**
- Simple SQLite storage
- Data clearly visible
- Minimal footprint

**Claude-Mem:**
- SQLite + Chroma vector DB
- More sophisticated storage
- Larger footprint

**Winner: Tie** (both excellent on privacy)

---

### 8. Extensibility

**Threadkeeper:**
- Simple hook system
- Easy to modify
- Good for understanding how it works
- Limited to SessionStart currently
- ✅ Readable source code

**Claude-Mem:**
- 5 different hooks
- More extension points
- More flexible
- Better for customization
- More complex to modify

**Winner: Claude-Mem** (more flexible)

---

## Strengths & Weaknesses

### Threadkeeper Strengths ✅
- **Dead simple** - 1 command install
- **Zero config** - Works immediately
- **Lightweight** - Minimal overhead
- **Just launched** - Fresh, modern approach
- **Focuses on one job** - Does it well
- **Easy to understand** - Simple codebase
- **Fast** - Keyword search is instant

### Threadkeeper Weaknesses ❌
- **Limited search** - Keywords only, not semantic
- **Single hook** - Only captures on SessionStart
- **No UI** - CLI only
- **Less data** - Doesn't capture tool outputs
- **Less mature** - Brand new
- **No team features** - Local only

---

### Claude-Mem Strengths ✅
- **Semantic search** - Understands meaning
- **Multiple hooks** - Captures more context
- **Web dashboard** - See what was found
- **Mature** - Battle-tested, proven
- **Token efficient** - 3-layer search = less tokens
- **More data** - Captures everything
- **Established community** - Already in use

### Claude-Mem Weaknesses ❌
- **Complex setup** - Multiple steps
- **More configuration** - Not zero-config
- **Heavier footprint** - Uses Chroma + SQLite
- **Less transparent** - More moving parts
- **Steeper learning curve** - More to understand
- **Slower** - Embeddings take time
- **Overkill** for simple use case

---

## When To Use Each

### Choose **Threadkeeper** if you:
- ✅ Want something that just works
- ✅ Don't want to configure anything
- ✅ Prefer simplicity
- ✅ Like CLI-based tools
- ✅ Have straightforward context needs
- ✅ Want to understand the source code

### Choose **Claude-Mem** if you:
- ✅ Want semantic search
- ✅ Need to capture tool outputs
- ✅ Want a web dashboard
- ✅ Have complex context needs
- ✅ Need multiple hook points
- ✅ Want token efficiency optimization

---

## Technical Comparison

```javascript
// THREADKEEPER
// Keyword: "authentication"
// Search: %authentication%
// Speed: ~10ms
// Relevance: Good for obvious matches
// False positives: Low
// False negatives: High

// CLAUDE-MEM
// Keyword: "authentication"
// Search: Embedding similarity
// Speed: ~100-500ms
// Relevance: Understands semantic meaning
// False positives: Very low
// False negatives: Low
```

---

## The Verdict

**Threadkeeper** = Simple, focused, just-works solution
- Perfect for Claude Code users who want automatic context
- Minimal overhead
- Zero configuration
- Great starting point

**Claude-Mem** = Comprehensive, sophisticated, feature-rich solution
- Perfect for users who want full memory management
- Better search quality
- More context captured
- More customizable

---

## Recommendation

**Use both?** 
- Threadkeeper for automatic context injection on session start
- Claude-Mem for advanced memory management and search
- They're complementary, not competitive

**Or choose one:**
- **Threadkeeper** if you value simplicity and just want it to work
- **Claude-Mem** if you value sophistication and comprehensive memory

---

## Key Insight

The fundamental difference:

- **Threadkeeper** = Set it and forget it
- **Claude-Mem** = Actively manage your memory

Both solve the context persistence problem, just in different ways.

Threadkeeper wins on **ease of use**.  
Claude-Mem wins on **capability**.

For most Claude Code users? **Threadkeeper's simplicity is the feature.**
