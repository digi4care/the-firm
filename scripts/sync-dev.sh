#!/usr/bin/env bash
set -euo pipefail

# Dev sync: APPEND_SYSTEM.md + runtime dirs (om slash commands te testen)

mkdir -p .pi

# Kopieer APPEND_SYSTEM.md
cp src/APPEND_SYSTEM.md .pi/APPEND_SYSTEM.md

# Kopieer runtime dirs
RUNTIME_DIRS=("extensions" "schemas" "lib" "skills")

for dir in "${RUNTIME_DIRS[@]}"; do
  if [ -d "src/$dir" ]; then
    mkdir -p ".pi/$dir"
    rsync -av --delete "src/$dir/" ".pi/$dir/"
  fi
done

echo "Dev sync voltooid (APPEND_SYSTEM.md + runtime dirs)"
