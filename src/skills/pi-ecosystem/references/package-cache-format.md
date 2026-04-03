# Package Cache Format

## Directory Structure

```
<ai_docs>/package-cache/
├── pi-subagents/
│   ├── package.json      # From npm registry (latest version)
│   ├── README.md         # From npm or GitHub
│   └── metadata.json     # Cache metadata
├── pi-mcp-adapter/
│   └── ...
└── ...
```

## metadata.json Format

```json
{
  "name": "pi-subagents",
  "version": "0.11.0",
  "description": "Pi extension for delegating tasks to subagents",
  "fetchedAt": "2026-02-25T12:00:00Z",
  "source": "npm",
  "npmUrl": "https://www.npmjs.com/package/pi-subagents",
  "repoUrl": "https://github.com/nicobailon/pi-subagents",
  "homepage": "https://github.com/nicobailon/pi-subagents#readme",
  "hasReadme": true,
  "hasRepo": true
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Package name |
| `version` | string | Latest version from npm |
| `description` | string | Package description |
| `fetchedAt` | ISO 8601 | When cache was created |
| `source` | string | Always "npm" |
| `npmUrl` | string | Link to npm package page |
| `repoUrl` | string | GitHub repository URL (if available) |
| `homepage` | string | Homepage URL (if available) |
| `hasReadme` | boolean | Whether README.md was fetched |
| `hasRepo` | boolean | Whether repository URL exists |
