#!/usr/bin/env bash
set -euo pipefail

# Maak .pi directory aan
mkdir -p .pi

# Kopieer alles behalve APPEND_SYSTEM.md
rsync -av --delete --exclude='APPEND_SYSTEM.md' src/ .pi/

# Verwijder APPEND_SYSTEM.md als deze toch in .pi/ terecht is gekomen (bijv. na een dev sync)
rm -f .pi/APPEND_SYSTEM.md

echo "Prod sync voltooid (zonder APPEND_SYSTEM.md)"
