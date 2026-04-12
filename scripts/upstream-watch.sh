#!/usr/bin/env bash
#
# upstream-watch.sh — Daily upstream triage for The Firm
#
# Usage:
#   npm run upstream:watch          # full daily routine
#   npm run upstream:watch -- --quick  # just show new commits/issues
#
# Reads: docs/upstream/BASELINE.md (for current baseline commit)
# Writes: stdout (triage report for human review)
#
# After review, update:
#   docs/upstream/ADOPTION-LOG.md   # for adopted/adapted/rejected items
#   docs/upstream/BASELINE.md       # if re-baselining
#

set -euo pipefail

REPO="badlogic/pi-mono"
BASELINE_FILE="docs/upstream/BASELINE.md"
QUICK=false

for arg in "$@"; do
  case "$arg" in
    --quick|-q) QUICK=true ;;
  esac
done

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Extract baseline commit ─────────────────────────────────────────────────
if [ ! -f "$BASELINE_FILE" ]; then
  echo -e "${RED}Error: $BASELINE_FILE not found${NC}"
  exit 1
fi

BASELINE=$(grep -oP 'commit:\s*`?\K[a-f0-9]{40}' "$BASELINE_FILE" | head -1)
if [ -z "$BASELINE" ]; then
  echo -e "${RED}Error: could not extract baseline commit from $BASELINE_FILE${NC}"
  exit 1
fi

echo -e "${BOLD}${CYAN}═══ The Firm — Upstream Watch Report ═══${NC}"
echo -e "Repository: $REPO"
echo -e "Baseline:   ${BASELINE:0:12}"
echo ""

# ── Fetch latest upstream ───────────────────────────────────────────────────
echo -e "${BOLD}${YELLOW}Fetching upstream...${NC}"
git fetch upstream 2>/dev/null || {
  echo -e "${RED}Could not fetch upstream. Add it with:${NC}"
  echo "  git remote add upstream https://github.com/badlogic/pi-mono.git"
  exit 1
}

UPSTREAM_HEAD=$(git rev-parse upstream/main)
COMMITS_SINCE=$(git rev-list --count "${BASELINE}..upstream/main" 2>/dev/null || echo "?")

echo -e "Upstream HEAD: ${UPSTREAM_HEAD:0:12}"
echo -e "Commits since baseline: ${COMMITS_SINCE}"
echo ""

if [ "$QUICK" = true ]; then
  echo -e "${BOLD}${GREEN}Quick mode — showing summary only.${NC}"
  echo -e "Run without --quick for full triage."
  exit 0
fi

# ── Recent commits (last 7 days) ────────────────────────────────────────────
echo -e "${BOLD}${YELLOW}── Recent upstream commits (last 7 days) ──${NC}"
git log upstream/main --since="7 days ago" --oneline --no-merges 2>/dev/null | head -30 || echo "(none or fetch failed)"
echo ""

# ── Relevant file changes ───────────────────────────────────────────────────
echo -e "${BOLD}${YELLOW}── Upstream changes in files The Firm cares about ──${NC}"
git log upstream/main --since="7 days ago" --oneline --no-merges \
  -- "packages/ai/" "packages/agent/" "packages/coding-agent/" \
     "packages/tui/" "packages/web-ui/" \
  2>/dev/null | head -20 || echo "(none)"
echo ""

# ── Open upstream issues ────────────────────────────────────────────────────
echo -e "${BOLD}${YELLOW}── Recent open upstream issues ──${NC}"
if command -v gh &>/dev/null; then
  gh issue list --repo "$REPO" --state open --limit 10 \
    --json number,title,labels,createdAt \
    --jq '.[] | "\(.number)\t\(.title)\t\(.labels | map(.name) | join(","))"' 2>/dev/null \
    | column -t -s$'\t' || echo "(gh CLI not authenticated or no issues)"
else
  echo "(gh CLI not installed)"
fi
echo ""

# ── Open upstream PRs ───────────────────────────────────────────────────────
echo -e "${BOLD}${YELLOW}── Recent open upstream PRs ──${NC}"
if command -v gh &>/dev/null; then
  gh pr list --repo "$REPO" --state open --limit 10 \
    --json number,title,labels,createdAt \
    --jq '.[] | "\(.number)\t\(.title)\t\(.labels | map(.name) | join(","))"' 2>/dev/null \
    | column -t -s$'\t' || echo "(gh CLI not authenticated or no PRs)"
else
  echo "(gh CLI not installed)"
fi

echo ""
echo -e "${BOLD}${CYAN}── Next Steps ──${NC}"
echo "1. Review the commits/issues/PRs above"
echo "2. For each relevant item, decide: adopt / adapt / reject / track"
echo "3. Update docs/upstream/ADOPTION-LOG.md with decisions"
echo "4. If re-baselining, update docs/upstream/BASELINE.md"
echo ""
echo -e "${BOLD}${CYAN}Quick commands:${NC}"
echo "  gh issue view <number> --repo $REPO --json title,body,comments,labels,state"
echo "  gh pr view <number> --repo $REPO --json title,body,commits,files,comments,labels,state"
echo "  git diff ${BASELINE:0:12}..upstream/main -- packages/ai/"
