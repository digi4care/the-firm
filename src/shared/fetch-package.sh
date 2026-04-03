#!/bin/bash
# Fetch and cache a Pi npm package
# Usage: ./fetch-package.sh <package-name> [--force]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Config is in the same directory (shared/)
source "$SCRIPT_DIR/config.sh"

PACKAGE_NAME="${1:?Package name required}"
FORCE="${2:-}"

# Check if already cached
if [[ "$FORCE" != "--force" ]] && is_package_cached "$PACKAGE_NAME"; then
  echo "✅ Package '$PACKAGE_NAME' already cached"
  CACHE_PATH=$(get_cached_package_path "$PACKAGE_NAME")
  echo "   Location: $CACHE_PATH"
  echo ""
  echo "Contents:"
  ls -la "$CACHE_PATH" 2>/dev/null || true
  exit 0
fi

# Ensure config exists
if ! config_exists; then
  echo "No config found. Creating global config..."
  create_config "global"
fi

# Get paths
AI_DOCS=$(get_ai_docs_path)
CACHE_PATH=$(get_package_cache_path)
PACKAGE_CACHE="$CACHE_PATH/$PACKAGE_NAME"

mkdir -p "$PACKAGE_CACHE"

echo "=== Fetching package: $PACKAGE_NAME ==="
echo "Cache location: $PACKAGE_CACHE"
echo ""

# 1. Fetch package info from npm registry
echo "1. Fetching from npm registry..."
NPM_DATA=$(curl -s "https://registry.npmjs.org/$PACKAGE_NAME")

if echo "$NPM_DATA" | jq -e '.error' > /dev/null 2>&1; then
  echo "   Error: Package not found on npm"
  rm -rf "$PACKAGE_CACHE"
  exit 1
fi

# Extract info
VERSION=$(echo "$NPM_DATA" | jq -r '."dist-tags".latest // .version')
DESCRIPTION=$(echo "$NPM_DATA" | jq -r '.description // "No description"')
REPO_URL=$(echo "$NPM_DATA" | jq -r '.repository.url // empty' | sed 's/^git+//' | sed 's/\.git$//')
HOMEPAGE=$(echo "$NPM_DATA" | jq -r '.homepage // empty')

echo "   Version: $VERSION"
echo "   Description: $DESCRIPTION"
[[ -n "$REPO_URL" ]] && echo "   Repository: $REPO_URL"

# Save package.json
echo "$NPM_DATA" | jq '.versions["'$VERSION'"]' > "$PACKAGE_CACHE/package.json" 2>/dev/null || \
  echo "$NPM_DATA" > "$PACKAGE_CACHE/package.json"

# 2. Fetch README from npm
echo ""
echo "2. Fetching README..."
README_DATA=$(curl -s "https://registry.npmjs.org/$PACKAGE_NAME/latest" | jq -r '.readme // empty')

if [[ -n "$README_DATA" && "$README_DATA" != "null" ]]; then
  echo "$README_DATA" > "$PACKAGE_CACHE/README.md"
  echo "   Saved README from npm"
fi

# 3. Try to fetch README from GitHub if available and npm README is missing/short
if [[ -n "$REPO_URL" ]]; then
  # Normalize GitHub URL
  GH_URL=$(echo "$REPO_URL" | sed 's|.*github.com[:/]||' | sed 's|/$||')
  
  if [[ -n "$GH_URL" ]]; then
    # Check if we need GitHub README
    README_LINES=0
    if [[ -f "$PACKAGE_CACHE/README.md" ]]; then
      README_LINES=$(wc -l < "$PACKAGE_CACHE/README.md")
    fi
    
    if [[ "$README_LINES" -lt 50 ]]; then
      echo ""
      echo "3. Fetching README from GitHub ($GH_URL)..."
      
      GH_README=$(gh api "repos/$GH_URL/contents/README.md" --jq '.content' 2>/dev/null | base64 -d)
      
      if [[ -n "$GH_README" ]]; then
        echo "$GH_README" > "$PACKAGE_CACHE/README.md"
        echo "   Saved README from GitHub"
      fi
    fi
  fi
fi

# 4. Create metadata
echo ""
echo "4. Creating metadata..."
cat > "$PACKAGE_CACHE/metadata.json" << EOF
{
  "name": "$PACKAGE_NAME",
  "version": "$VERSION",
  "description": "$DESCRIPTION",
  "fetchedAt": "$(date -Iseconds)",
  "source": "npm",
  "npmUrl": "https://www.npmjs.com/package/$PACKAGE_NAME",
  "repoUrl": "$REPO_URL",
  "homepage": "$HOMEPAGE",
  "hasReadme": $(test -f "$PACKAGE_CACHE/README.md" && echo "true" || echo "false"),
  "hasRepo": $(test -n "$REPO_URL" && echo "true" || echo "false")
}
EOF

# 5. Update config
echo ""
echo "5. Updating config..."
update_config ".cache.packages[\"$PACKAGE_NAME\"]" "$(cat << EOF
{
  "cached": true,
  "fetchedAt": "$(date -Iseconds)",
  "version": "$VERSION",
  "source": "npm",
  "hasReadme": $(test -f "$PACKAGE_CACHE/README.md" && echo "true" || echo "false"),
  "repoUrl": "$REPO_URL"
}
EOF
)"

echo ""
echo "=== Done ==="
echo "Package cached at: $PACKAGE_CACHE"
echo ""
echo "Files:"
ls -la "$PACKAGE_CACHE"

echo ""
echo "Install command: pi install npm:$PACKAGE_NAME"
