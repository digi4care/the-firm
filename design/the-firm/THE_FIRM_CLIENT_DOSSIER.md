# The Firm Client Dossier Design v0.3

## Purpose

This document defines the client dossier: what it contains, how it's structured, when it's created, who owns it, and how it evolves.

The client dossier is the foundation of every engagement. It exists before the intake conversation begins. It grows with every interaction. It is the institutional memory that makes The Firm behave like a firm that remembers its clients -- not a tool that starts from scratch every session.

## Why a dossier, not just config

BMAD-METHOD has `config.yaml` with technical metadata. Pi has runtime config. Neither has CRM-level relationship memory.

The dossier combines three things:

1. **Technical profile** -- what BMAD gets right: stack, skill level, project type
2. **Relational memory** -- what real agencies track: communication style, history, patterns, lessons
3. **Working intelligence** -- what neither has: what works for this client, what doesn't, what to avoid

Without the dossier, every engagement starts from zero. The Firm would ask the same questions, make the same assumptions, repeat the same mistakes. That is not how a professional firm operates.

## Design principles

1. **Created at first contact, not after intake** -- the dossier exists before the conversation starts. Even a new client gets a minimal dossier with what we know so far.
2. **Grows, never shrinks** -- information is added, not removed. Old entries are marked as superseded, not deleted.
3. **Machine-readable format** -- YAML, consistent with `intake.yml`. Every field is parseable.
4. **Minimal viable structure** -- only fields that earn their place. No aspirational sections that stay empty. Target: ~25 fields across 6 sections.
5. **Owned by the relationship holder** -- Intake creates it, Client Partner maintains it post-intake.
6. **Never exposed raw to the client** -- the dossier is internal. The client sees the intake summary, not their file.

## Dossier schema

### Section 1: Identity

Who this client is.

```yaml
identity:
  id: "firm-client-001"          # Auto-generated, immutable
  display_name: "Example Client"  # How The Firm refers to them
  created: "2026-04-03"           # Date of first contact
  last_contact: "2026-04-03"      # Date of most recent interaction
  source: "direct"                # direct | referral | rescue
  status: "active"                # active | dormant | archived
```

**Design notes:**

- `id` is immutable and never reused. It links to engagement records.
- `display_name` is for internal reference, not necessarily a legal name.
- `last_contact` is updated after every engagement and every significant interaction. It drives dormancy calculation -- a client with `last_contact` older than 90 days becomes `dormant`.
- `source` affects intake handling. A rescue client needs different treatment than a greenfield client.
- `status` drives cleanup. Dormant clients after 90 days without engagement get archived.

### Section 2: Profile

What kind of developer they are and when they work.

```yaml
profile:
  background: "Full-stack developer, 5+ years, primarily TypeScript/React"
  skill_level: "intermediate"      # beginner | intermediate | advanced | expert
  known_stack:
    - "TypeScript"
    - "React"
    - "Node.js"
    - "PostgreSQL"
  availability: "evenings-and-weekends"  # full-time | evenings-and-weekends | on-demand
  bandwidth: "limited"             # unlimited | flexible | limited | constrained
```

**Design notes:**

- `background` is free-text. The Intake Lead uses this to calibrate conversation depth.
- `skill_level` is The Firm's assessment, not self-reported. Doctrine rule 15 applies: developer-first, not handholding. An advanced developer gets architecture tradeoff discussions; an intermediate developer gets guided options.
- `known_stack` is factual. What they work with, not what they want to learn.
- `availability` and `bandwidth` capture when and how much the client can engage. A solo dev on evenings-only has different cadence needs than one working full-time. This replaces the vague `working_context` field -- it answers two concrete questions: when are they available, and how much capacity do they have.

### Section 3: Communication

How to talk to them and how they interact with The Firm.

```yaml
communication:
  language: "nl"                   # ISO 639-1 code -- what the client speaks
  response_language: "en"          # Language for artifacts and documentation
  style: "direct"                  # direct | explanatory | concise | detailed
  accessibility:
    needs:                         # List of accessibility accommodations
      - dyslexia                   # Affects: shorter paragraphs, clear structure, no walls of text
      - adhd                       # Affects: focus on one topic at a time, minimize context switching
    output_preferences:            # How to format output for this client
      - "short paragraphs"
      - "bullet lists over prose"
  mode: "collaborative"            # collaborative | directed | advisory
```

**Design notes:**

- `language` is what the client speaks. `response_language` is what The Firm produces. These can differ.
- `style` is calibrated during intake and refined over time. "Direct" means: no filler, no ceremony, get to the point. "Explanatory" means: context and reasoning before conclusions.
- `accessibility.needs` is a list of named accommodations. Each need maps to concrete output behaviors. This is not optional formatting -- it is an accessibility requirement. Known needs: `dyslexia` (shorter paragraphs, clear structure, no walls of text), `adhd` (one topic at a time, minimize context switching, clear task boundaries). The list is open -- new needs can be added as they are discovered.
- `accessibility.output_preferences` is a concrete list of formatting rules derived from the needs. Agents apply these directly to their output. This bridges the gap between "the client has dyslexia" and "format your output differently".
- `mode` replaces the separate `steering` and `interaction_mode` fields. It captures both how the client wants to interact and how much control they want. Collaborative = client is involved in decisions. Directed = client gives instructions, Firm executes. Advisory = Firm recommends, client decides. One concept, one field.

### Section 4: Preferences

What they want from The Firm and how they define success.

```yaml
preferences:
  quality_bar: "professional"      # prototype | professional | production
  decision_velocity: "deliberate"   # fast | deliberate | slow
  time_sensitivity: "normal"       # low | normal | high | critical
  success_criteria:
    - "Working feature deployed to production"
    - "All tests passing"
  constraints:
    - "MIT license for all output"
    - "No cloud services, self-hosted only"
  engagement_style: "structured"   # structured | flexible | minimal
```

**Design notes:**

- `quality_bar` is not about the Firm's quality (that's always high), but about what level of rigor the client needs for this specific context. A prototype doesn't need full E2E test coverage; production does.
- `decision_velocity` captures how fast the client makes decisions. Fast = "just do it". Deliberate = wants to weigh options. Slow = needs time and evidence. This affects how The Firm presents choices and how many options to surface.
- `time_sensitivity` drives urgency handling. Critical = expedited flow, skip non-essential steps. Normal = standard flow.
- `success_criteria` is how the client defines "this worked". Not The Firm's definition -- the client's. This keeps The Firm honest about delivering what matters to the client, not what The Firm thinks should matter.
- `constraints` is an open list. Non-negotiable rules the client has stated.
- `engagement_style` affects intake flow. "Structured" = full flow. "Minimal" = expedited when possible.

### Section 5: Engagement history

What we've done together.

```yaml
engagement_history:
  current:
    id: "firm-engage-004"
    type: "scoped-delivery"
    status: "in_delivery"
  past:
    - id: "firm-engage-001"
      type: "idea-shaping"
      date: "2026-03-15"
      outcome: "completed"
      summary: "Initial concept refinement for project X"
    - id: "firm-engage-002"
      type: "plan-review"
      date: "2026-03-20"
      outcome: "completed"
      summary: "Reviewed existing plan, identified 3 gaps"
    - id: "firm-engage-003"
      type: "greenfield-build"
      date: "2026-03-25"
      outcome: "paused"
      summary: "Build started, paused due to client availability"
```

**Design notes:**

- No `total` field. Count is derived from `past` list length. Denormalized counts drift.
- `current` is either null or a single engagement. A client has at most one active engagement at a time.
- `past` entries are append-only. Status and outcome may be updated, but entries are never deleted.
- `type` uses the engagement types from the Client Engagement Model: `idea-shaping`, `plan-review`, `plan-optimization`, `greenfield-build`, `brownfield-adoption`, `scoped-delivery`, `rescue`.
- `outcome` values: `completed`, `paused`, `cancelled`. Defined here, not just referenced, because the dossier must be self-contained.

### Section 6: Patterns

What we've learned about working with this client.

```yaml
patterns:
  request_types:                   # What they typically come to The Firm for
    - "plan-review"
    - "scoped-delivery"
  strengths:                       # What they're good at
    - "Clear problem statements"
    - "Responsive to questions"
  watch_outs:                      # What to be careful about
    - "Tends to underestimate scope"
    - "Prefers quick iterations over thorough planning"
  distilled:                       # Lessons learned, flat list
    - "Prefers short bullet lists over long paragraphs"
    - "Responds well when options are presented with a recommendation"
```

**Design notes:**

- This section is the highest-value part of the dossier. It's what makes The Firm get better at serving this specific client over time.
- `request_types` is accumulated, not manually set. It's the distribution of past engagement types.
- `strengths` and `watch_outs` are refined after each engagement. They are subjective but based on evidence.
- `distilled` replaces the structured `lessons` list. Per-engagement date/engagement linkage was over-engineered -- the lesson matters more than the metadata. If traceability is needed, git history provides it.

## Complete example

```yaml
# The Firm Client Dossier
# This file is internal. Never expose raw to the client.

dossier:
  version: 1

identity:
  id: "firm-client-001"
  display_name: "Digi4Care"
  created: "2026-04-03"
  last_contact: "2026-04-03"
  source: "direct"
  status: "active"
profile:
  background: "Full-stack developer, primarily TypeScript/Node.js ecosystem"
  skill_level: "intermediate"
  known_stack:
    - "TypeScript"
    - "JavaScript"
    - "React"
    - "Node.js"
    - "Bun"
  availability: "evenings-and-weekends"
  bandwidth: "limited"

communication:
  language: "nl"
  response_language: "en"
  style: "direct"
  accessibility:
    needs:
      - dyslexia
    output_preferences:
      - "short paragraphs"
      - "bullet lists over prose"
  mode: "collaborative"
preferences:
  quality_bar: "professional"
  decision_velocity: "deliberate"
  time_sensitivity: "normal"
  success_criteria:
    - "The Firm builds itself successfully (dogfooding)"
    - "Design decisions are defensible and documented"
  constraints:
    - "MIT license for all output"
    - "Build on Pi SDK, no alternative runtimes"
  engagement_style: "structured"

engagement_history:
  current: null
  past: []

patterns:
  request_types: []
  strengths: []
  watch_outs: []
  distilled: []
```

## What moved out of the dossier

### Technical project details

Fields like `project_path`, `entry_point`, `repository_url`, `tech_stack_summary`, `project_type`, `testing_practice`, and `architecture_state` now live in the project config (`./.firm/project.yml`), validated by a Zod schema in `src/schemas/project.ts`. They are not client-level data; they are project-specific technical context that changes per engagement.

Reason: a client may have multiple projects. The dossier captures who they are (global, stable data). The project config captures what they're building right now (project-specific, mutable data). This gives technical details a proper home with schema validation, rather than treating them as orphaned fields.

### Notes section

Removed. The "stays small" principle means notes should either be promoted to structured fields or not exist. Git commit messages serve the purpose of timestamped, attributed notes.

## Dossier lifecycle

### Creation

1. Client contacts The Firm (or The Firm identifies a new client context).
2. Intake Lead creates a minimal dossier with `identity` and any known `profile` fields.
3. Remaining fields are populated during the intake conversation.
4. The dossier is saved before the intake conversation begins.

### During engagement

1. Intake Lead consults the dossier before starting conversation.
2. Request Analyst updates `patterns` based on classification.
3. Brief Writer references dossier context in the brief.
4. Client Partner takes ownership of the dossier after intake.

### After engagement

1. Client Partner updates `engagement_history` with outcome.
2. Client Partner refines `patterns` based on retrospective.
3. Any new `preferences` or `constraints` discovered during engagement are added.

### Dormancy and archival
1. A client with `last_contact` older than 90 days becomes `dormant`.
2. `last_contact` is updated after every engagement and every significant interaction.
3. A dormant client can be reactivated with a new engagement.
4. Archived clients are retained but not loaded into active context.

### Project lifecycle

1. Project config (`./.firm/project.yml`) is created when `npx the-firm --project` runs in a project directory.
2. The config references the client dossier via `identity.client_id`, linking project to client.
3. During engagements, technical project details are updated in the project config, not the dossier.
4. The project config evolves alongside the engagement brief and intake records.

## Ownership model

| Phase | Owner | What they update |
|---|---|---|
| First contact | Intake Lead | Creates dossier, populates identity + initial profile |
| Intake conversation | Intake Lead | Profile, communication, preferences |
| Classification | Request Analyst | Patterns (request_types) |
| Post-intake handoff | Intake Lead → Client Partner | Full ownership transfer |
| During engagement | Client Partner | Engagement history, patterns, preferences |
| After engagement | Client Partner | Outcomes, patterns, pattern refinement |

## Format and storage

- **Format:** YAML (consistent with `intake.yml`, machine-readable, version-controllable)
- **File name:** `client-dossier.yml` (dossier), `project.yml` (project config)
- **Storage layers:**
  - **Global:** `~/.firm/clients/<client-id>/client-dossier.yml` — installed via `npx the-firm --global`
  - **Project:** `./.firm/project.yml` — installed via `npx the-firm --project` (or `npx the-firm` in a project directory)
- **Git versioning:** The dossier is committed to git. Changes are tracked through commits, not internal versioning.
- **Project reference:** Project config references client dossier via `identity.client_id`.

### Version field

The `version` field in the dossier tracks the schema version, not the content version. When the schema changes, existing dossiers must be migrated.

Current schema version: `1`

## Relationship to other artifacts

| Artifact | Relationship |
|---|---|
| `intake.yml` | Per-engagement. References client dossier by `identity.id`. Contains project-level technical details. |
| Client brief | Per-engagement. Uses dossier context as input. |
| Engagement register | Cross-references dossier for client-level aggregation. |

| `project.yml` | Per-project. References client dossier by `identity.client_id`. Contains project-specific technical context and engagement state. |
| Pattern library | Dossier patterns feed into the department-level pattern library. |

## What the dossier is NOT

- **Not a project config.** The dossier is the global client record (in `~/.firm/clients/`). Project-level configuration lives in `./.firm/project.yml`. Both use Zod schemas for validation.
- **Not a replacement for intake.** The dossier is input to intake, not its output.
- **Not exposed to the client.** The client sees the intake summary. The dossier is internal intelligence.
- **Not a dumping ground.** Every field must earn its place. If a section stays empty across three engagements, it gets removed.

## Design decisions and rationale

### Why YAML, not Markdown

The dossier must be machine-readable. Intake agents, the Client Partner, and engagement workflows must parse and update it programmatically. Markdown is for human-readable documents. YAML is for structured data that humans can also read.

### Why one dossier per client, not per project

A client's communication style, accessibility needs, and patterns don't change per project. The technical profile does, but that's one section. Splitting by project would duplicate relational data. If a client has multiple projects, the technical section can be extended with a `projects` list.

### Why patterns are separate from engagement history

Engagement history is factual (what happened). Patterns are analytical (what it means). Mixing them makes the dossier harder to maintain and harder to learn from. Separation keeps history clean and patterns actionable.

### Why skill_level is The Firm's assessment

Self-reported skill level is unreliable. An intermediate developer may overestimate (Dunning-Kruger) or underestimate (impostor syndrome). The Firm calibrates through observation during intake and adjusts over time. This is documented in the dossier, not shared with the client.

### Why technical project details are not in the dossier

Fields like `project_path`, `entry_point`, and `tech_stack_summary` are engagement-specific. They change per engagement, not per client. Putting them in the client dossier couples client identity to project state. Instead, they live in `intake.yml` and the engagement brief where they belong.

### Why lessons were flattened to distilled

The structured `lessons` format (date, engagement ID, lesson text) was over-engineered. In practice, the lesson content matters more than its metadata. Git history already provides traceability. A flat list is easier to maintain, easier to read, and more likely to be kept up to date.


### Why global/project split

Client identity, communication preferences, and behavioral patterns are stable across projects. A client's accessibility needs don't change when they start a new project. Technical context, however, changes per project — stack, entry points, architecture state. A solo developer may work on multiple projects for the same client. The global/project split keeps stable client data in one place while allowing per-project variation. The global install (`npx the-firm --global`) enables cross-project client memory; The Firm remembers the client even when you switch repositories.

## Version history

- v0.3 -- global/project storage split; added project config schema; Zod validation schemas in `src/schemas/`; npx installer concept
- v0.2 -- scenario-tested: expanded accessibility from boolean to structured needs + output_preferences; added last_contact to identity; defined engagement types and outcome values inline
- v0.1 -- refined after agency-pattern review: added decision_velocity, time_sensitivity, success_criteria; merged steering + interaction_mode; removed project-specific technical fields; flattened lessons to distilled
- v0 -- initial design, based on BMAD research + agency patterns + handoff findings