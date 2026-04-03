#!/usr/bin/env bash
#
# Find Flaky Test Polluter
#
# Identifies which test pollutes global state and causes other tests to fail.
# Usage: ./find-polluter.sh <test-pattern> [runs]
#

set -euo pipefail

TEST_PATTERN="${1:-"**/*.test.ts"}"
RUNS="${2:-3}"

echo "=== Finding Test Polluter ==="
echo "Pattern: $TEST_PATTERN"
echo "Runs: $RUNS"
echo ""

# Get all test files
echo "Finding test files..."
TEST_FILES=$(find . -name "$TEST_PATTERN" -type f | head -20)
FILE_COUNT=$(echo "$TEST_FILES" | wc -l)
echo "Found $FILE_COUNT test files"
echo ""

# Test each file in isolation
echo "=== Testing files in isolation ==="
ISOLATED_RESULTS=()

for file in $TEST_FILES; do
  echo -n "Testing $file... "

  PASSED=0
  for i in $(seq 1 $RUNS); do
    if bun test "$file" > /dev/null 2>&1; then
      ((PASSED++))
    fi
  done

  if [ $PASSED -eq $RUNS ]; then
    echo "✓ ($PASSED/$RUNS passed)"
    ISOLATED_RESULTS+=("$file:PASS")
  else
    echo "✗ ($PASSED/$RUNS passed)"
    ISOLATED_RESULTS+=("$file:FAIL")
  fi
done

echo ""
echo "=== Testing all files together ==="
TOGETHER_PASSED=0
for i in $(seq 1 $RUNS); do
  if bun test $TEST_FILES > /dev/null 2>&1; then
    ((TOGETHER_PASSED++))
  fi
done
echo "Together: $TOGETHER_PASSED/$RUNS passed"
echo ""

# Find polluters
echo "=== Analysis ==="
if [ $TOGETHER_PASSED -eq $RUNS ]; then
  echo "✓ All tests pass together - no polluter found"
  exit 0
fi

echo "✗ Tests fail when run together"
echo ""
echo "Potential polluters (pass in isolation, fail together):"

for result in "${ISOLATED_RESULTS[@]}"; do
  file="${result%%:*}"
  status="${result##*:}"

  if [ "$status" = "PASS" ]; then
    echo "  - $file"
  fi
done

echo ""
echo "Next steps:"
echo "1. Check these files for global state mutations"
echo "2. Look for: process.env changes, global mocks, singleton modifications"
echo "3. Add beforeEach/afterEach cleanup"
echo "4. Run bisect: include/exclude files to narrow down"
