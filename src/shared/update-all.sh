#!/bin/bash
# Update everything - docs + ecosystem
# Usage: ./update-all.sh [--local|--global]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Pi Knowledge Base - Full Update ==="
echo ""

# Determine scope
SCOPE="${1:---global}"

# Update docs
echo "1. Fetching documentation from GitHub..."
"$SCRIPT_DIR/update-docs.sh" "$SCOPE"

echo ""
echo "2. Fetching npm ecosystem..."

# For ecosystem, we need to know the docs dir
if [[ "$SCOPE" == "--local" ]]; then
    DOCS_DIR=".ai_docs"
else
    DOCS_DIR="$HOME/.ai_docs"
fi

# Run ecosystem update with the docs dir
DOCS_DIR="$DOCS_DIR" "$SCRIPT_DIR/update-ecosystem.sh"

echo ""
echo "=== Full Update Complete ==="
echo "Knowledge base: $DOCS_DIR"
