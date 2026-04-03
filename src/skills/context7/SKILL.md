---
name: context7
description: Retrieve up-to-date documentation for software libraries, frameworks, and components via the Context7 API. Keywords - documentation, library, framework, API, reference, docs, lookup, external.
allowed-tools: Bash Read
---

# Context7

**Live documentation retrieval** - Fetch current docs for external libraries instead of relying on potentially outdated training data.

## When to Use This Skill

| Trigger | Action |
|---------|--------|
| "Look up docs for [library]" | Search Context7 for library documentation |
| "How do I use [framework]?" | Fetch current API documentation |
| "What's the latest [library] API?" | Query Context7 for up-to-date info |
| "Find documentation for [package]" | Search and retrieve library docs |
| "Get current docs for [library]" | Fetch live documentation |
| User asks about external library | Check if library is in registry, fetch docs |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "How do Pi extensions work?" | `/skill:pi-encyclopedia` |
| "Find an npm package for X" | `/skill:pi-ecosystem` |
| "What's in my project's AGENTS.md?" | Read the file directly |
| "Help me debug this code" | Direct debugging assistance |
| "Create a new Pi skill" | `/skill:skill-creator` |

## Workflow

### Step 1: Search for the Library

Find the Context7 library ID using the search endpoint:

```bash
curl -s "https://context7.com/api/v2/libs/search?libraryName=LIBRARY_NAME&query=TOPIC" | jq '.results[0]'
```

**Parameters:**

- `libraryName` (required): Library name (e.g., "react", "nextjs", "fastapi")
- `query` (required): Topic description for relevance ranking

**Response fields:**

- `id`: Library identifier (e.g., `/websites/react_dev_reference`)
- `title`: Human-readable library name
- `totalSnippets`: Number of documentation snippets available

### Step 2: Fetch Documentation

Retrieve documentation using the library ID:

```bash
curl -s "https://context7.com/api/v2/context?libraryId=LIBRARY_ID&query=TOPIC&type=txt"
```

**Parameters:**

- `libraryId` (required): The library ID from step 1
- `query` (required): Specific topic to retrieve
- `type` (optional): `json` (default) or `txt` (plain text, more readable)

### Step 3: Check Library Registry (Optional)

For known libraries, check `library-registry.md` for:

- Aliases and common variations
- Optimized query patterns
- Common topics

## Examples

### React hooks documentation

```bash
# Find React library ID
curl -s "https://context7.com/api/v2/libs/search?libraryName=react&query=hooks" | jq '.results[0].id'

# Fetch useState documentation
curl -s "https://context7.com/api/v2/context?libraryId=/websites/react_dev_reference&query=useState&type=txt"
```

### Next.js App Router

```bash
# Find Next.js library ID
curl -s "https://context7.com/api/v2/libs/search?libraryName=nextjs&query=routing" | jq '.results[0].id'

# Fetch app router documentation
curl -s "https://context7.com/api/v2/context?libraryId=/vercel/next.js&query=app+router&type=txt"
```

### FastAPI dependencies

```bash
# Find FastAPI library ID
curl -s "https://context7.com/api/v2/libs/search?libraryName=fastapi&query=dependencies" | jq '.results[0].id'

# Fetch dependency injection documentation
curl -s "https://context7.com/api/v2/context?libraryId=/fastapi/fastapi&query=dependency+injection&type=txt"
```

## Error Handling

| Situation | Response |
|-----------|----------|
| Library not found in search | Try alternative names/aliases, check spelling |
| Empty search results | Broaden query, verify library exists in Context7 |
| No documentation returned | Refine query terms, try broader topic |
| API rate limited | Wait and retry, or suggest user check docs directly |
| Network error | Retry with timeout, suggest offline alternatives |
| First result incorrect | Check `results[1]` and `results[2]` for alternatives |

## Quick Tests

**Should trigger:**

- "Look up React hooks documentation"
- "Get docs for Drizzle ORM migrations"
- "What's the current Next.js App Router API?"
- "Find documentation for TanStack Query"
- "How do I use Better Auth with Next.js?"

**Should not trigger:**

- "How do I configure Pi providers?"
- "What extensions are available?"
- "Debug this TypeScript error"
- "Create a new skill for my project"

**Functional:**

- "Look up Zod schema validation docs and show me how to create a refinements"

## Tips

- Use `type=txt` for more readable output
- Use `jq` to filter and format JSON responses
- Be specific with the `query` parameter to improve relevance
- URL-encode query parameters containing spaces (use `+` or `%20`)
- No API key required for basic usage (rate-limited)

## References

- `references/library-registry.md` - Supported libraries, aliases, and optimized query patterns
- `references/navigation.md` - File structure and quick routes
- `references/registry.json` - Reference index with metadata

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **pi-encyclopedia** | Pi documentation | Learning about Pi features |
| **pi-ecosystem** | Package discovery | Finding npm packages |
| **skill-creator** | Create skills | Building new Pi skills |
