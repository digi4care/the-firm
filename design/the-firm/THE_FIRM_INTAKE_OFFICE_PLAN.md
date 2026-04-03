# Plan: Intake Office Implementatie

**Issue:** the-firm-djq
**Datum:** 2026-04-03
**Gebaseerd op:** THE_FIRM_INTAKE_OFFICE_RESEARCH.md

## Beslissingen

### 1. Eén skill, drie fases

De drie agents (Lead, Analyst, Brief Writer) worden **fases in één intake skill**. Pi heeft geen aparte runtime agents — een skill is het juiste mechanisme.

### 2. Hergebruik bestaande skills

| Bestaande skill | Rol in intake flow |
|---|---|
| `firm-front-desk` | Blijft apart — routes naar intake |
| `intake-classification` | Content wordt reference in nieuwe intake skill |
| `backlog-distillation` | Blijft apart — post-intake |

### 3. Config schema is klaar

`src/extensions/workflows/lib/config.ts` bevat het samengevoegde schema. De agent gebruikt de `write` tool om `.firm/config.yml` weg te schrijven.

## Wat we gaan bouwen

### Nieuwe skill: `intake`

Locatie: `src/skills/intake/SKILL.md` (synced naar `.pi/skills/intake/`)

```
src/skills/intake/
  SKILL.md                          ← hoofdinstructies: hele intake flow
  references/
    config-template.yml             ← template voor .firm/config.yml
    classification-guide.md         ← engagement types en routing (uit intake-classification)
    questions-guide.md              ← welke vragen, in welke volgorde (uit agent design docs)
```

### SKILL.md structuur

De skill bevat drie fases als secties:

**Fase 1: Verwelkomen en verzamelen (Intake Lead)**
- Begroet de klant
- Auto-detecteer uit package.json
- Stel vragen één voor één
- Vat samen en vraag bevestiging

**Fase 2: Classificeren (Request Analyst)**
- Bepaal engagement type
- Bepaal routing (welke office(s))
- Check compleetheid

**Fase 3: Wegschrijven (Brief Writer)**
- Valideer alle velden
- Schrijf `.firm/config.yml`
- Bevestig dat alles opgeslagen is

### Frontmatter

```yaml
---
name: intake
description: Voert intake uit voor The Firm. Verwelkomt de klant, stelt vragen, classificeert het engagement, en slaat de configuratie op. Gebruik /tf-intake om te starten.
---
```

De description is bewust in het Nederlands — de klant is Nederlandstalig en de agent moet reageren in de taal van de klant.

### Interaction met /tf-intake command

Het command stuurt `pi.sendUserMessage()` met een prompt. De agent leest de skill description en laadt de skill automatisch omdat de prompt over intake gaat.

Als de agent de skill niet automatisch laadt, kan het command aangepast worden om `/skill:intake` in de prompt te zetten.

## Stappen

1. **Skill directory maken** — `src/skills/intake/` met SKILL.md + references
2. **References vullen** — config-template.yml, classification-guide.md, questions-guide.md
3. **Bestaande skills opruimen** — `intake-classification` referenties fixen (classification-guide.md mist)
4. **Testen** — `/tf-intake` runnen en kijken of de agent de skill laadt en de flow volgt
5. **Itereren** — op basis van de eerste test de skill verbeteren

## Wat we NIET doen (YAGNI)

- Geen aparte runtime agents
- Geen sub-agents
- Geen extensions voor intake (het command is genoeg)
- Geen globale `~/.firm/` directory
- Geen client dossier YAML — alles zit in `.firm/config.yml`

## Risico's

1. **Agent laadt skill niet automatisch** — oplossing: `/skill:intake` in command prompt
2. **Agent volgt de fases niet strikt** — oplossing: skill instructies verscherpen na eerste test
3. **Config YAML wordt ongeldig** — oplossing: template met voorbeeld in references

## Volgende stap

Build (the-firm-5lk) — de skill daadwerkelijk maken en testen.
