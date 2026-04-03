#!/bin/bash
# Update the npm ecosystem reference file with ALL pi-packages
# Saves to ~/.ai_docs/ or .ai_docs/ depending on DOCS_DIR env var

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine docs directory
if [[ -z "$DOCS_DIR" ]]; then
    DOCS_DIR="$HOME/.ai_docs"
fi

# Create if not exists
mkdir -p "$DOCS_DIR"

ECOSYSTEM_FILE="$DOCS_DIR/npm-ecosystem.md"
TEMP_PACKAGES=$(mktemp)

trap "rm -f $TEMP_PACKAGES" EXIT

echo "Fetching ALL pi-package entries from npm..."
echo "Target: $ECOSYSTEM_FILE"
echo ""

# npm registry API uses 'from' for pagination (offset-based)
PAGE_SIZE=100
TOTAL=0
FROM=0

# First request to get total
FIRST_RESPONSE=$(curl -s "https://registry.npmjs.org/-/v1/search?text=keywords:pi-package&size=$PAGE_SIZE&from=0")
TOTAL=$(echo "$FIRST_RESPONSE" | jq '.total')
echo "Total packages found: $TOTAL"

# Process first batch
echo "$FIRST_RESPONSE" | jq -r '.objects[] | "\(.package.name)|\(.package.version)|\(.package.description // "no description")"' >> "$TEMP_PACKAGES"
FETCHED=$(echo "$FIRST_RESPONSE" | jq '.objects | length')
echo "Fetched: $FETCHED packages"

# Fetch remaining pages
FROM=$PAGE_SIZE
while [ $FROM -lt $TOTAL ]; do
    echo "Fetching from offset $FROM..."
    RESPONSE=$(curl -s "https://registry.npmjs.org/-/v1/search?text=keywords:pi-package&size=$PAGE_SIZE&from=$FROM")
    COUNT=$(echo "$RESPONSE" | jq '.objects | length')

    if [ "$COUNT" -eq 0 ]; then
        echo "No more results"
        break
    fi

    echo "$RESPONSE" | jq -r '.objects[] | "\(.package.name)|\(.package.version)|\(.package.description // "no description")"' >> "$TEMP_PACKAGES"
    FETCHED=$((FETCHED + COUNT))
    echo "Fetched: $FETCHED / $TOTAL"

    FROM=$((FROM + PAGE_SIZE))
done

echo ""
echo "Total packages fetched: $(wc -l < "$TEMP_PACKAGES")"

# Generate the markdown file
cat > "$ECOSYSTEM_FILE" << HEADER
# Pi NPM Ecosystem

All \`pi-package\` packages on npm. Use \`pi install npm:<package>\` to install.

**Search:** https://www.npmjs.com/search?q=keywords%3Api-package

**Total packages:** $TOTAL
**Last updated:** $(date +%Y-%m-%d)

---

## All Packages

| Package | Version | Description |
|---------|---------|-------------|
HEADER

# Sort and format packages as table rows
sort "$TEMP_PACKAGES" | while IFS='|' read -r name version desc; do
    # Truncate long descriptions
    if [ ${#desc} -gt 80 ]; then
        desc="${desc:0:77}..."
    fi
    echo "| [\`$name\`](https://www.npmjs.com/package/$name) | $version | $desc |"
done >> "$ECOSYSTEM_FILE"

cat >> "$ECOSYSTEM_FILE" << 'FOOTER'

---

## Installation

```bash
# Install globally
pi install npm:<package-name>

# Install specific version
pi install npm:<package-name>@1.2.3

# Install project-local
pi install npm:<package-name> -l

# Try without installing
pi -e npm:<package-name>
```

## Creating Packages

Add to `package.json`:

```json
{
  "name": "my-pi-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

## Gallery

Browse packages visually at: https://shittycodingagent.ai/packages
FOOTER

echo ""
echo "✅ Updated: $ECOSYSTEM_FILE"
echo "📊 Total packages: $TOTAL"
