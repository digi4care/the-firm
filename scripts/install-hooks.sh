#!/usr/bin/env bash
# Install git hooks from scripts/git-hooks/ into .git/hooks/
set -euo pipefail

HOOKS_DIR="scripts/git-hooks"
GIT_HOOKS_DIR=".git/hooks"

if [ ! -d "$GIT_HOOKS_DIR" ]; then
	echo "Error: .git/hooks/ not found. Run from repo root."
	exit 1
fi

for hook in "$HOOKS_DIR"/*; do
	if [ -f "$hook" ]; then
		hook_name=$(basename "$hook")
		target="$GIT_HOOKS_DIR/$hook_name"
		cp "$hook" "$target"
		chmod +x "$target"
		echo "Installed: $hook_name"
	fi
done

echo "Git hooks installed."
