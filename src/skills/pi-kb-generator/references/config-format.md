# Config Format

## Location

```
.ai_docs/openpi-mastery-config.json   # Local
~/.ai_docs/openpi-mastery-config.json # Global
```

## Schema

```json
{
  "version": "1.0",
  "scope": "global",
  "lastUpdated": "2026-02-25T12:00:00Z",
  "paths": {
    "aiDocs": "~/.ai_docs",
    "packageCache": "~/.ai_docs/package-cache"
  },
  "cache": {
    "docs": {
      "github": {
        "fetchedAt": "ISO8601",
        "files": 56
      },
      "npm": {
        "fetchedAt": "ISO8601",
        "packages": 343
      }
    },
    "packages": {
      "<package-name>": {
        "cached": true,
        "fetchedAt": "ISO8601",
        "version": "x.y.z",
        "source": "npm",
        "hasReadme": true,
        "repoUrl": "https://..."
      }
    }
  },
  "settings": {
    "autoCachePackages": true,
    "cacheRepoInfo": true
  }
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Config schema version |
| `scope` | string | "local" or "global" |
| `lastUpdated` | ISO 8601 | Last modification time |
| `paths.aiDocs` | string | Path to ai_docs directory |
| `paths.packageCache` | string | Path to package cache |
| `cache.docs.github` | object | GitHub docs fetch info |
| `cache.docs.npm` | object | npm ecosystem fetch info |
| `cache.packages` | object | Cached packages registry |
| `settings.autoCachePackages` | boolean | Auto-fetch on first access |
| `settings.cacheRepoInfo` | boolean | Fetch GitHub README |

## Usage in Scripts

```bash
source shared/config.sh

# Get config path
CONFIG=$(get_config_path)

# Read value
VERSION=$(jq -r '.version' "$CONFIG")

# Update value
update_config ".settings.autoCachePackages" "false"
```
