# The Firm — Strategy: Fork naar Eigen Product

> **Datum:** 2026-04-11
> **Status:** Research → Bespreken → Beslissen → Implementeren

---

## 🎋 Vraag van Chris

> "Ik wil 2 binaries: production en development (voor testing)"

---

## 1. Hoe Anderen Dit Doen

### Pi (upstream)

| Aspect | Hoe |
|--------|-----|
| Binary naam | `pi` (1 binary) |
| Dev starten | `npm run dev` → `tsgo --watch` in monorepo |
| Prod starten | `npm install -g @mariozechner/pi-coding-agent` → `pi` |
| Extensies laden | `~/.pi/agent/extensions/` of `.pi/extensions/` (jiti) |
| Config dir | `.pi/` |
| Testen | `vitest --run` in packages |

### Oh-My-Pi (can1357/oh-my-pi)

| Aspect | Hoe |
|--------|-----|
| Binary naam | `omp` (eigen naam, duidelijk anders dan `pi`) |
| Fork strategie | **Volledige monorepo fork**, identieke structuur |
| Package naam | `@oh-my-pi/pi-coding-agent` (upstream namespace behouden) |
| Config dir | `.omp/` (eigen `piConfig.configDir`) |
| Eigen commands | `.omp/commands/`, `.omp/rules/`, `.omp/skills/` |
| Dev | `bun run dev` vanuit monorepo |
| Build | `bun build --compile` → single binary `dist/omp` |

### OpenCode (anomalyco/opencode)

| Aspect | Hoe |
|--------|-----|
| Binary naam | `opencode` |
| Architectuur | **Volledig nieuw** — gebruikt Vercel AI SDK ipv Pi's ai package |
| Package manager | `bun` |
| Dev | `bun run dev` vanuit monorepo |

### Patroon

**Iedereen die Pi forked:** 
1. Eigen binary naam (`omp`, `the-firm`, etc.)
2. Eigen config directory (`.omp/`, `.the-firm/`)
3. Eigen package namespace (`@oh-my-pi/`, `@digi4care/`)
4. Monorepo structuur behouden
5. 1 binary, dev via `npm run dev` of `bun run dev`

---

## 2. The Firm Huidige Staat

We zitten in een **tussenstaat** die niet goed werkt:

```
PROBLEMEN:
├── Config dir = .the-firm/ maar extensie loader zoekt relatief
├── the-firm-ext/ imports naar ../src/ breken na npm install
├── Geen duidelijke dev vs prod flow
├── Extension niet beschikbaar na npm install -g
└── Symlink hacks voor extension loading
```

---

## 3. Drie Strategieën

### Strategie A: Pi Package (Geen Fork Nodig)

** Idee:** The Firm is een Pi package, geen fork.

```
~/.pi/agent/extensions/the-firm/
├── package.json          # pi manifest
├── index.ts              # extension entry
├── skills/               # 3 skills
├── prompts/              # 10 prompts
└── rules/                # 2 rules
```

```bash
# Installeren:
pi install git:github.com/digi4care/the-firm

# Gebruiken:
pi    # start Pi met The Firm extensie geladen
```

| Voor | Tegen |
|------|-------|
| ✅ Geen fork nodig | ❌ Geen provider hardening (bugs blijven) |
| ✅ Pi's eigen update flow | ❌ Geen eigen configDir |
| ✅ Simpelste setup | ❌ Afhankelijk van upstream Pi release cycle |
| ✅ Werkt met bestaande Pi | ❌ Geen core changes mogelijk |

**Conclusie:** Te beperkt. We hebben provider hardening en core changes nodig.

---

### Strategie B: Volledige Fork met 2 Binaries ⭐ (AANBEVOLEN)

** Idee:** Eigen monorepo fork, twee binaries:

| Binary | Doel | Wanneer |
|--------|------|---------|
| `the-firm` | **Production** | Geïnstalleerd via `npm install -g` |
| `firm-dev` | **Development** | Lokaal vanuit source, met hot reload |

```
digi4care/the-firm (monorepo fork)
├── packages/coding-agent/
│   ├── bin/
│   │   ├── the-firm.ts     # production entry (CLI)
│   │   └── firm-dev.ts     # development entry
│   ├── src/                 # Pi source + The Firm modifications
│   ├── the-firm/            # The Firm's eigen code
│   │   ├── extension/       # extension index.ts + assets
│   │   ├── tools/           # 9 KB tools
│   │   ├── defaults/        # 18 templates
│   │   └── ...
│   └── package.json         # @digi4care/the-firm
└── packages/ai/             # Pi ai + provider hardening
```

#### Hoe `the-firm` (production) werkt:

```bash
# Build
npm run build              # monorepo build

# Install
npm install -g .           # installeert the-firm + firm binaries

# Gebruik
cd my-project
the-firm                   # start TUI
```

Extension loading: de extension zit **baked into de package**, niet in een externe directory.

Hoe? Twee opties:

**Optie B1: Extension als built-in laden**
```typescript
// src/core/extensions/loader.ts — voeg The Firm extensie toe aan built-ins
import theFirmExtension from "../../the-firm/extension/index.js";

// In loadExtensions():
if (THE_FIRM_BUILT_IN) {
    extensions.push(theFirmExtension);
}
```

**Optie B2: Extension via package.json pi manifest**
```json
{
  "name": "@digi4care/the-firm",
  "pi": {
    "extensions": ["./dist/the-firm/extension"]
  }
}
```

Pi's package loader leest de `pi` manifest en laadt extensies automatisch.

#### Hoe `firm-dev` (development) werkt:

```bash
# vanuit de monorepo source:
cd ~/projects/the-firm
firm-dev                   # start direct vanuit TypeScript source
                           # jiti laadt .ts files, geen build nodig
                           # wijzigingen = direct zichtbaar na restart
```

Implementatie: `firm-dev` is een wrapper script:

```typescript
// bin/firm-dev.ts
#!/usr/bin/env node
// Start Pi vanuit TypeScript source met The Firm extension geladen
import { startCli } from "../src/cli.js";
// Of simpeler: pas NODE_PATH aan en forward naar Pi's dev mode
```

Of nog simpeler: een shell script:

```bash
#!/bin/bash
# bin/firm-dev.sh
cd "$(dirname "$0")/.." 
exec npx tsx packages/coding-agent/src/cli.ts "$@"
```

| Voor | Tegen |
|------|-------|
| ✅ Eigen binary met eigen identiteit | ❌ Onderhoud van fork vs upstream |
| ✅ Provider hardening ingebouwd | ❌ Merge conflicten bij upstream sync |
| ✅ Core changes mogelijk | ❌ Meer complexiteit dan Strategie A |
| ✅ Dev zonder build (jiti/tsx) | |
| ✅ Prod met build (tsgo) | |
| ✅ Eigen configDir (.the-firm/) | |

---

### Strategie C: Fork + Externe Extension Package

** Idee:** Fork is minimaal (alleen provider hardening), The Firm is een npm package die je installeert.

```bash
# Fork gebruikt = @digi4care/pi (minimale fork)
the-firm install @digi4care/the-firm-ext
the-firm  # start met extension
```

| Voor | Tegen |
|------|-------|
| ✅ Minimale fork | ❌ Twee packages beheren |
| ✅ Extension los updatebaar | ❌ Extension imports blijven broos |
| ✅ Scheiding van concerns | ❌ complexiteit in distribution |

---

## 4. Aanbeveling

### ⭐ Strategie B: Volledige Fork met 2 Binaries

**Waarom:**
1. Oh-my-pi bewijst dat dit model werkt (omp binary, .omp/ configDir)
2. We hebben al de volledige fork
3. Provider hardening is al geïmplementeerd
4. 2 binaries is de standaard dev/prod workflow in elke monorepo

### Het Plan

```
 Stap 1: Extension loading fixen
 ├── Optie: pi manifest in package.json (pi.extensions)
 ├── De extension files moeten in dist/ zitten na build
 └── Imports moeten werken vanuit zowel source als dist

 Stap 2: Binary setup
 ├── package.json: bin.the-firm = dist/cli.js (production)
 ├── package.json: bin.firm-dev = bin/firm-dev.sh (development)
 └── firm-dev.sh start tsx met source paths

 Stap 3: Verify
 ├── npm install -g . → the-firm werkt
 ├── firm-dev vanuit source → werkt met hot reload
 └── Beide laden The Firm extension automatisch
```

---

## 5. Open Vragen voor Chris

1. **Binary namen:** `the-firm` + `firm-dev`? Of andere namen?
2. **Config dir:** `.the-firm/` behouden? Of terug naar `.pi/` (makkelijker voor compatibiliteit)?
3. **Dev tool:** `tsx`, `bun`, of `tsgo --watch`?
4. **Extension loading:** Baked-in (code) of via pi manifest (data)?

---

*Volgende stap: Bespreek met Chris → kies strategie → implementeer*
