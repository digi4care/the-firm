# The Firm — 3-Branch Strategie

> **Datum:** 2026-04-11
> **Status:** VOORSTEL → bespreken met Chris

---

## Het Model

```
upstream/badlogic/pi-mono         origin/digi4care/the-firm
        │                                  │
        ▼                                  ▼
┌─────────────────┐              ┌──────────────────┐
│   original      │              │   production     │
│   (upstream)    │              │   (stable)       │
│                 │              │                  │
│  Alleen Mario's │              │ npm install -g   │
│  commits.       │              │ the-firm         │
│  Never edit.    │              │                  │
│  Track & audit. │              │ Getagged als     │
│                 │              │ the-firm-v0.1.0  │
└────────┬────────┘              └────────▲─────────┘
         │                                │
         │ cherry-pick / merge            │ release cut
         │ (analyseer eerst!)             │ (als stabiel)
         ▼                                │
┌─────────────────────────────────────────┴─────────┐
│                  development                       │
│               (dagelijks werk)                     │
│                                                    │
│  • The Firm features                              │
│  • Provider hardening                             │
│  • Bug fixes                                      │
│  • Upstream merges (gefilterd)                    │
│  • firm-dev binary start hier                     │
│                                                    │
│  npm run build → test → commit                    │
│  firm-dev (tsx vanuit source)                     │
└────────────────────────────────────────────────────┘
```

---

## De 3 Branches

### 1. `original` — Upstream Spiegel

| Eigenschap | Waarde |
|------------|--------|
| **Bron** | `upstream/main` (badlogic/pi-mono) |
| **Doel** | Track Mario's wijzigingen, analyseren, audit |
| **Edits** | ❌ NOOIT — alleen fetch + merge vanuit upstream |
| **Updates** | `git fetch upstream && git merge upstream/main` |
| **Binary** | `pi` (ongewijzigd) — testen of upstream nog werkt |

```bash
# Setup (eenmalig)
git checkout -b original upstream/main

# Dagelijks: check wat Mario gedaan heeft
git checkout original
git fetch upstream
git log HEAD..upstream/main --oneline    # wat is nieuw?
git merge upstream/main                   # sync

# Analyseren: welke changes zijn relevant voor The Firm?
git diff development..original -- packages/ai/  # provider changes?
git diff development..original -- packages/coding-agent/src/core/  # core changes?
```

### 2. `development` — Actieve Ontwikkeling

| Eigenschap | Waarde |
|------------|--------|
| **Bron** | Fork van `original`, met The Firm wijzigingen |
| **Doel** | Alle ontwikkeling, features, bug fixes |
| **Edits** | ✅ Ja — dit is de werkpaard |
| **Binary** | `firm-dev` (start vanuit source, jiti/tsx) |
| **ConfigDir** | `.the-firm/` |
| **Tests** | Vitest, 237+ tests |

```bash
# Ontwikkeling
git checkout development
firm-dev                    # start vanuit TypeScript source
                            # wijzigingen direct zichtbaar na /reload

# Upstream changes integreren
git checkout original && git merge upstream/main   # sync original
git checkout development
git merge original                                # merge naar development
# Resolve conflicts, test, commit
```

### 3. `production` — Stabiele Release

| Eigenschap | Waarde |
|------------|--------|
| **Bron** | Release cut vanuit `development` |
| **Doel** | Stabiele, geteste versie |
| **Edits** | ❌ Alleen hotfixes |
| **Binary** | `the-firm` (gebuild, globally installed) |
| **ConfigDir** | `.the-firm/` |

```bash
# Release flow
git checkout development
npm run build && npm run test       # quality gates

git checkout production
git merge development
# tag release
git tag the-firm-v0.1.0
git push origin production --tags

# Install
npm install -g .                    # installeert `the-firm` binary
```

---

## Flow: Upstream Change → Development → Production

```
Mario doet een fix in pi-mono
         │
         ▼
original: git merge upstream/main
         │
         ▼
Analyseer: relevant voor The Firm?
    ├── Nee → ignore, note in CHANGELOG
    └── Ja ↓
         │
         ▼
development: git merge original
         │  resolve conflicts, test
         │
         ▼
firm-dev testen
         │
         ▼
production: git merge development
         │  build, tag, publish
         │
         ▼
the-firm (production binary)
```

---

## Binary Overzicht

| Binary | Branch | Hoe gestart | Config dir | Build nodig? |
|--------|--------|-------------|------------|-------------|
| `pi` | `original` | `node dist/cli.js` | `.pi/` | Ja (`npm run build`) |
| `firm-dev` | `development` | `npx tsx src/cli.ts` | `.the-firm/` | Nee (jiti/tsx) |
| `the-firm` | `production` | `npm install -g` | `.the-firm/` | Ja (`npm run build`) |

---

## Setup Stappen

```bash
cd ~/projects/the-firm

# 1. original branch (upstream mirror)
git checkout -b original upstream/main
git push origin original

# 2. development branch (vanaf huidige main)
git checkout main
git checkout -b development
git push origin development

# 3. production branch (eerste release cut)
git checkout -b production
git push origin production

# 4. Cleanup: main → development als default
# (GitHub: Settings → Default branch → development)
```

---

## Voor- en Nadelen

### ✅ Voordelen

- **Scheidt concerns** — upstream tracking vs eigen werk vs stabiele releases
- **Upstream audit** — je ziet precies wat Mario veranderd, voordat je integreert
- **Risk-free development** — `firm-dev` start zonder build, breekt niks in production
- **Cherry-pick controle** — je kiest ZELF welke upstream changes meegaan
- **Rollback** — production kan altijd terug naar vorige tag
- **Duidelijk voor AI agents** — `original` = niet aankomen, `development` = werkpaard, `production` = heilig

### ⚠️ Nadelen

- **Merge conflicts** — bij elke upstream merge kunnen The Firm aanpassingen conflicteren
- **3 branches beheren** — meer administratie
- **Cherry-pick discipline** — moet je echt doen, niet blind mergen

### Mitigatie

- Beperk The Firm modifications tot `the-firm/` subdirectory (zoals oh-my-pi)
- Hou `THE_FIRM_MODIFICATIONS.md` bij als manifest
- Merge upstream frequent (elke week?) — minder conflict buildup

---

## Open Vragen

1. **GitHub default branch:** `development` als default? (logischer voor dagelijks werk)
2. **Branch protection:** `production` protected? (alleen via PR van development)
3. **Tag format:** `the-firm-v0.1.0` of `v0.1.0`?
4. **Upstream merge cadence:** wekelijks? per release?

---

*Volgende stap: Bespreken → akkoord → branches aanmaken → development flow testen*
