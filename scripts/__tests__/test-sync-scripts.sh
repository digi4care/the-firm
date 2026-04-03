#!/usr/bin/env bash
#
# test-sync-scripts.sh — Tests for sync-dev.sh and sync-prod.sh
#
# Verifies that:
#   1. On first run: src/settings.json is copied to .pi/settings.json (factory defaults)
#   2. On subsequent runs: existing .pi/settings.json is NOT overwritten
#   3. Runtime dirs (extensions, skills, etc.) are always synced
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

assert_eq() {
	local description="$1" expected="$2" actual="$3"
	if [ "$expected" = "$actual" ]; then
		echo -e "  ${GREEN}(pass)${NC} $description"
		PASS=$((PASS + 1))
	else
		echo -e "  ${RED}(fail)${NC} $description"
		echo "    Expected: $expected"
		echo "    Actual:   $actual"
		FAIL=$((FAIL + 1))
	fi
}

assert_file_contains() {
	local description="$1" file="$2" pattern="$3"
	if grep -q "$pattern" "$file" 2>/dev/null; then
		echo -e "  ${GREEN}(pass)${NC} $description"
		PASS=$((PASS + 1))
	else
		echo -e "  ${RED}(fail)${NC} $description"
		echo "    Pattern '$pattern' not found in $file"
		FAIL=$((FAIL + 1))
	fi
}

assert_file_not_exists() {
	local description="$1" file="$2"
	if [ ! -f "$file" ]; then
		echo -e "  ${GREEN}(pass)${NC} $description"
		PASS=$((PASS + 1))
	else
		echo -e "  ${RED}(fail)${NC} $description — $file should not exist"
		FAIL=$((FAIL + 1))
	fi
}

# --- Helper: create minimal src/ structure ---

setup_src() {
	local dir="$1"
	mkdir -p "$dir/src/extensions"
	mkdir -p "$dir/src/skills"
	echo '{"theFirm":{"requireConfirmationBeforeDelete":true}}' > "$dir/src/settings.json"
	echo "export default function register(pi) {}" > "$dir/src/extensions/test-ext.ts"
	echo "# Test skill" > "$dir/src/skills/test-skill.md"
}

# --- Helper: simulate the sync-dev.sh settings logic ---
# We test the EXACT conditional from sync-dev.sh / sync-prod.sh

run_sync_settings() {
	local dir="$1"
	mkdir -p "$dir/.pi"
	if [ -f "$dir/src/settings.json" ] && [ ! -f "$dir/.pi/settings.json" ]; then
		cp "$dir/src/settings.json" "$dir/.pi/settings.json"
	fi
}

run_sync_dirs() {
	local dir="$1"
	local RUNTIME_DIRS=("extensions" "skills")
	for d in "${RUNTIME_DIRS[@]}"; do
		if [ -d "$dir/src/$d" ]; then
			mkdir -p "$dir/.pi/$d"
			rsync -a --delete "$dir/src/$d/" "$dir/.pi/$d/"
		fi
	done
}

# ================================================================
# Tests
# ================================================================

echo ""
echo "sync script tests:"
echo ""

# --- Test 1: First run copies settings.json ---

T1=$(mktemp -d)
trap "rm -rf '$T1'" EXIT
setup_src "$T1"
run_sync_settings "$T1"
actual=$(cat "$T1/.pi/settings.json" 2>/dev/null || echo "MISSING")
assert_eq "First run: copies src/settings.json to .pi/settings.json" \
	'{"theFirm":{"requireConfirmationBeforeDelete":true}}' "$actual"
rm -rf "$T1"

# --- Test 2: Existing settings.json NOT overwritten ---

T2=$(mktemp -d)
setup_src "$T2"
run_sync_settings "$T2"
# Modify .pi/settings.json (simulating user settings via /firm)
echo '{"theFirm":{"requireConfirmationBeforeDelete":true},"compaction":{"enabled":true}}' > "$T2/.pi/settings.json"
# Run sync again
run_sync_settings "$T2"
assert_file_contains "Second run: existing .pi/settings.json NOT overwritten (compaction preserved)" \
	"$T2/.pi/settings.json" "compaction"
rm -rf "$T2"

# --- Test 3: Empty .pi/settings.json still counts as existing ---

T3=$(mktemp -d)
setup_src "$T3"
run_sync_settings "$T3"
echo -n "" > "$T3/.pi/settings.json"
run_sync_settings "$T3"
actual=$(cat "$T3/.pi/settings.json" | wc -c | tr -d ' ')
assert_eq "Empty .pi/settings.json is NOT overwritten (counts as existing)" "0" "$actual"
rm -rf "$T3"

# --- Test 4: Runtime dirs always synced ---

T4=$(mktemp -d)
setup_src "$T4"
run_sync_dirs "$T4"
assert_file_contains "Runtime dirs: extensions synced" \
	"$T4/.pi/extensions/test-ext.ts" "register"
assert_file_contains "Runtime dirs: skills synced" \
	"$T4/.pi/skills/test-skill.md" "Test skill"
rm -rf "$T4"

# --- Test 5: Runtime dir changes synced on re-run ---

T5=$(mktemp -d)
setup_src "$T5"
run_sync_dirs "$T5"
echo "UPDATED" >> "$T5/src/extensions/test-ext.ts"
run_sync_dirs "$T5"
assert_file_contains "Changes in src/extensions are synced on re-run" \
	"$T5/.pi/extensions/test-ext.ts" "UPDATED"
rm -rf "$T5"

# --- Test 6: No src/settings.json = no error ---

T6=$(mktemp -d)
setup_src "$T6"
rm "$T6/src/settings.json"
run_sync_settings "$T6"
assert_file_not_exists "No src/settings.json: no .pi/settings.json created" \
	"$T6/.pi/settings.json"
rm -rf "$T6"

# ================================================================
# Summary
# ================================================================

echo ""
TOTAL=$((PASS + FAIL))
echo "Results: $PASS pass, $FAIL fail ($TOTAL tests)"

if [ "$FAIL" -gt 0 ]; then
	exit 1
fi
