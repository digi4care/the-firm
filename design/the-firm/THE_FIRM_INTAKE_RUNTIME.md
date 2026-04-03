# The Firm — Intake Runtime Design

**Version:** 0.1  
**Status:** Draft  
**Related:** [Client Dossier Schema](../../src/schemas/client-dossier.ts), [Project Config Schema](../../src/schemas/project.ts)

---

## 1. Purpose

The `/tf-intake` command is the entry point for initializing The Firm's client-project scaffolding. When a user types this command in Pi, the extension creates the minimal directory structure and YAML files required to track a client and their project.

This is **not** the full intake conversation. It is the bootstrap phase that creates the filesystem scaffolding. Once complete, the intake skill (3-agent flow) takes over for the detailed interview.

---

## 2. Pi Mechanisms Used

| Mechanism | Usage |
|-----------|-------|
| `pi.registerCommand('tf-intake', { description, handler })` | Registers the slash command visible in Pi |
| Extension location | `.pi/extensions/tf-intake.ts` (project-local) or `~/.pi/agent/extensions/tf-intake.ts` (global) |
| `ctx.ui.input(prompt, placeholder)` | Prompt user for client name, project name |
| `ctx.ui.confirm(title, message)` | Confirm overwrite/update of existing configs |
| `ctx.ui.select(prompt, options)` | Choose between update/new engagement if project exists |
| `ctx.ui.notify(msg, level)` | Success/error feedback (levels: "info", "warning", "error") |
| `ctx.fs` (implied) | File system operations for creating directories/YAML |

---

## 3. Flow

```
User types /tf-intake
         │
         ▼
┌─────────────────────┐
│ Check for existing  │◄─────────────────────────────┐
│ project config      │                              │
│ (./.firm/project.yml)│                             │
└─────────────────────┘                              │
         │                                           │
    ┌────┴────┐                                      │
    │ EXISTS? │                                      │
    └────┬────┘                                      │
      YES/  \NO                                      │
        /    \                                       │
       ▼      ▼                                      │
Prompt: Update  Create .firm/                        │
or New?       ┌──────────┐                         │
       │      │ directory │                         │
       │      └─────┬─────┘                         │
       │            ▼                               │
       │      Create project.yml                    │
       │      (minimal: id, name,                   │
       │      client_id placeholder)                │
       │            │                               │
       └────────────┤                               │
                    ▼                               │
       ┌─────────────────────┐                      │
       │ Check for existing  │                      │
       │ client dossier      │                      │
       │ (~/.firm/clients/)  │                      │
       └─────────────────────┘                      │
                    │                               │
               ┌────┴────┐                         │
               │ EXISTS? │                         │
               └────┬────┘                         │
                 YES/  \NO                         │
                   /    \                          │
                  ▼      ▼                         │
           Use existing  Prompt: Client name       │
           dossier       via ctx.ui.input          │
                    │              │               │
                    │              ▼               │
                    │         Create               │
                    │         ~/.firm/clients/     │
                    │         <id>/                │
                    │         client-dossier.yml   │
                    │         (minimal data)       │
                    │                    │         │
                    └────────────────────┤         │
                                         ▼         │
                              Link project to client
                              via identity.client_id
                                         │
                                         ▼
                              ctx.ui.notify(
                                "Intake initialized. " +
                                "Client: <name>. Project: <name>.",
                                "info"
                              )
```

---

## 4. Directory Structure Created

### Global Level (per-client)
```
~/.firm/
  clients/
    firm-client-<id>/
      client-dossier.yml
```

The client ID follows the pattern `firm-client-[a-z0-9]+` as defined in [IdentitySchema](../../src/schemas/client-dossier.ts).

### Project Level (per-project)
```
./.firm/
  project.yml
```

The project ID follows the pattern `firm-project-[a-z0-9]+` as defined in [ProjectIdentitySchema](../../src/schemas/project.ts).

---

## 5. Interaction Model

**No wizards.** The interaction is direct and stateless:

| When | Method | Purpose |
|------|--------|---------|
| Need client name | `ctx.ui.input("Client name:", "Acme Corp")` | Get display name for new client |
| Need project name | `ctx.ui.input("Project name:", "Website Redesign")` | Get project display name |
| Project exists | `ctx.ui.select("Project exists:", [{label: "Update existing", value: "update"}, {label: "Start new engagement", value: "new"}])` | Choose action |
| Confirmation required | `ctx.ui.confirm("Overwrite?", "This will replace existing config.")` | Safety check |
| Success | `ctx.ui.notify("Intake initialized...", "info")` | Feedback to user |
| Error | `ctx.ui.notify("Failed: ...", "error")` | Error feedback |

---

## 6. Scenarios

### 6.1 New Client, New Project
1. No `~/.firm/clients/` entry found
2. No `./.firm/project.yml` found
3. Prompt: "Client name?"
4. Create `~/.firm/clients/firm-client-<uuid>/client-dossier.yml` with minimal data (identity section only)
5. Create `./.firm/project.yml` with `identity.client_id` linked
6. Notify: "Intake initialized. Client: X. Project: Y."

### 6.2 Existing Client, New Project
1. Found `~/.firm/clients/firm-client-<id>/client-dossier.yml`
2. No `./.firm/project.yml` found
3. Create `./.firm/project.yml` with `identity.client_id` pointing to existing client
4. Notify: "Intake initialized. Client: X (existing). Project: Y."

### 6.3 Existing Project
1. `./.firm/project.yml` exists
2. `ctx.ui.select()` offers:
   - **Update existing** — Modify current project config
   - **Start new engagement** — Update `current_engagement` section
3. Execute selected action
4. Notify: "Project updated." or "New engagement started."

---

## 7. Schema References

### Client Dossier
- **File:** [src/schemas/client-dossier.ts](../../src/schemas/client-dossier.ts)
- **Schema:** `ClientDossierSchema`
- **Location:** `~/.firm/clients/<client-id>/client-dossier.yml`
- **Sections:** identity, profile, communication, preferences, engagement_history, patterns

### Project Config
- **File:** [src/schemas/project.ts](../../src/schemas/project.ts)
- **Schema:** `ProjectConfigSchema`
- **Location:** `./.firm/project.yml`
- **Sections:** identity (with `client_id`), technical_context, current_engagement, constraints

### Relationship
```
Client 1:N Projects

Project.identity.client_id ──► Client.identity.id
```

---

## 8. Future Work

### Full Intake Conversation (Post-Scaffolding)
After `/tf-intake` creates the minimal structure, the **intake skill** (3-agent flow) takes over:

1. **Intake Agent** — Conducts structured interview to fill dossier sections
2. **Validation Agent** — Validates completeness and consistency
3. **Setup Agent** — Creates project scaffolding based on classified engagement type

This design doc covers **only** the scaffolding phase. The intake conversation is future work tracked separately.

### npx Installer (Backlog)
Installation via `npx the-firm` is a future convenience for global setup. Not implemented in v0.1.

---

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-04-03 | Initial design — scaffolding-only intake runtime |

---

## Appendix: Minimal File Templates

### client-dossier.yml (minimal)
```yaml
dossier:
  version: 1
identity:
  id: firm-client-abc123
  display_name: "Acme Corp"
  created: "2026-04-03"
  last_contact: "2026-04-03"
  source: direct
  status: active
profile:
  background: "TBD"
  skill_level: intermediate
  known_stack: []
  availability: on-demand
  bandwidth: flexible
communication:
  language: en
  response_language: en
  style: direct
  accessibility:
    needs: []
    output_preferences: []
  mode: collaborative
preferences:
  quality_bar: professional
  decision_velocity: deliberate
  time_sensitivity: normal
  success_criteria: []
  constraints: []
  engagement_style: flexible
engagement_history:
  current: null
  past: []
patterns:
  request_types: []
  strengths: []
  watch_outs: []
  distilled: []
```

### project.yml (minimal)
```yaml
project:
  version: 1
identity:
  id: firm-project-xyz789
  name: "Website Redesign"
  description: "TBD"
  client_id: firm-client-abc123
  created: "2026-04-03"
  status: active
technical_context:
  stack: []
current_engagement: null
constraints:
  additional: []
  excluded: []
```
