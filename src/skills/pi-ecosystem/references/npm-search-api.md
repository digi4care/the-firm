# npm Search API

## Search Endpoint

```
GET https://registry.npmjs.org/-/v1/search
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Search query |
| `size` | number | Results per page (max 250) |
| `from` | number | Offset for pagination |

## Example: Search Pi Packages

```bash
# Search all pi-package keyword
curl -s "https://registry.npmjs.org/-/v1/search?text=keywords:pi-package&size=100"

# Search with additional term
curl -s "https://registry.npmjs.org/-/v1/search?text=keywords:pi-package%20subagent&size=20"
```

## Response Structure

```json
{
  "total": 343,
  "objects": [
    {
      "package": {
        "name": "pi-subagents",
        "version": "0.11.0",
        "description": "Pi extension for subagents",
        "keywords": ["pi-package"],
        "links": {
          "npm": "https://www.npmjs.com/package/pi-subagents",
          "repository": "https://github.com/..."
        }
      }
    }
  ]
}
```

## Package Info Endpoint

```
GET https://registry.npmjs.org/<package-name>
GET https://registry.npmjs.org/<package-name>/latest
```

## Rate Limits

No authentication required. Be reasonable with request frequency.
