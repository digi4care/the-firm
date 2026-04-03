# Research: Intake Office Implementatie

**Issue:** the-firm-aqg
**Datum:** 2026-04-03

## Vraagstelling

Hoe implementeren we de Intake Office in Pi? Drie agents (Lead, Analyst, Brief Writer) + skill + command.

## Bevindingen

### 1. Pi kent geen "agent" als runtime concept

Pi heeft:
- **Skills** (SKILL.md) — kennispakketten die de agent laadt. Een skill geeft instructies aan de bestaande agent. Het creëert geen nieuwe agent.
- **Extensions** (.ts) — TypeScript modules die events hooken, tools registreren, commands maken.
- **Commands** (/slash) — gebruiker triggert een actie.

Er is geen mechanisme om "agent A" en "agent B" als aparte runtime entiteiten te starten binnen één Pi sessie. BMAD doet dit ook niet — die gebruikt skills met persona's (wat Chris niet wil).

**Conclusie:** De drie intake "agents" worden waarschijnlijk **rollen binnen één skill**, geen aparte runtime agents.

### 2. Skills zijn het juiste mechanisme voor intake kennis

Een skill in Pi:
- Bevat instructies die de agent volgt
- Kan references/ bevatten met extra documentatie
- Kan scripts/ bevatten voor hulpfuncties
- Wordt automatisch ontdekt in `.pi/skills/`
- Beschrijving in frontmatter bepaalt wannéér de agent het laadt

**De intake skill moet bevatten:**
- Stappen voor het intake gesprek (Lead rol)
- Classificatie logica (Analyst rol)
- Template voor config.yml (Brief Writer rol)
- Auto-detectie logica (package.json lezen)

### 3. Bestaande skills dekken delen van de flow

| Skill | Wat het doet | Bruikbaar? |
|---|---|---|
| `firm-front-desk` | Routes input naar juiste workflow | Ja — dit is de router vóór intake |
| `intake-classification` | Classificeert engagement type | Ja — dit is de Request Analyst |

Deze skills zijn nog OMP-syntax (niet Pi-geoptimaliseerd), maar de inhoud is relevant.

### 4. Het /tf-intake command is al herschreven

Het command stuurt nu `pi.sendUserMessage()` met een prompt die de agent vertelt intake te doen. Maar de agent heeft geen skill om te weten HOE.

### 5. Config wegschrijven

De agent kan `.firm/config.yml` wegschrijven met de `write` tool. Geen extension nodig — de agent doet het zelf met zijn ingebouwde tools.

### 6. Sub-agents in Pi

Pi ondersteunt sub-agents via `task` calls — de hoofdagent kan werk uitbesteden. Maar voor intake is dat overkill: het is één gesprek dat lineair verloopt (Lead → Analyst → Brief Writer).

## Aanbeveling

### Minimale werkende versie (MVP)

Eén intake skill die de hele flow doet:

```
intake/
  SKILL.md          ← instructies: hele intake flow
  references/
    config-template.yml    ← template voor .firm/config.yml
    classification-guide.md ← engagement types en routing
```

De skill bevat de drie rollen als **fasen** in één proces:
1. Lead fase: verwelkomen, vragen stellen, auto-detect
2. Analyst fase: classificeren, routing bepalen
3. Writer fase: config schrijven

Geen aparte agents, geen sub-agents. Eén skill, één gesprek.

### Na de MVP

Als we later echt aparte agents willen (bijv. omdat Lead en Analyst verschillende systeem prompts nodig hebben), kunnen we:
- Meerdere skills maken die elkaar aanroepen
- Of extensions gebruiken die `pi.sendMessage()` gebruiken om context door te geven

Maar dat is YAGNI voor nu.

### Bestaande skills hergebruiken

- `intake-classification` → de classificatie-logica kan in de intake skill references
- `firm-front-desk` → blijft apart, die routeert vóór de intake

## Open vragen

1. Moet de intake skill automatisch laden bij `/tf-intake`, of expliciet via `/skill:intake`?
   - **Aanbeveling:** automatisch — het `/tf-intake` command stuurt een prompt die de skill triggert op basis van de description
2. Moeten we de bestaande `intake-classification` en `firm-front-desk` skills samenvoegen of apart houden?
   - **Aanbeveling:** apart houden, maar refereren vanuit de intake skill
3. Wat als de agent de skill niet automatisch laadt?
   - **Oplossing:** het command kan `/skill:intake` injecteren in de prompt

## Volgende stap

Plan maken (the-firm-djq) op basis van deze bevindingen.
