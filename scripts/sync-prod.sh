#!/usr/bin/env bash
set -euo pipefail

# Prod sync: kopieer alleen runtime-bestanden van src/ naar .pi/
# Geen APPEND_SYSTEM.md (dat is alleen voor dev)

mkdir -p .pi

# Kopieer settings.json
if [ -f "src/settings.json" ]; then
  cp src/settings.json .pi/settings.json
fi

RUNTIME_DIRS=("extensions" "prompts" "lib" "skills" "commands" "shared")

for dir in "${RUNTIME_DIRS[@]}"; do
  if [ -d "src/$dir" ]; then
    mkdir -p ".pi/$dir"
    rsync -av --delete "src/$dir/" ".pi/$dir/"
  fi
done

# Zorg dat APPEND_SYSTEM.md nooit in .pi/ staat in prod
rm -f .pi/APPEND_SYSTEM.md

echo "Prod sync voltooid (runtime dirs: ${RUNTIME_DIRS[*]})"
