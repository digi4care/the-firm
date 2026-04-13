# Product Requirements Document — The Firm

## 1. Problem Statement
AI-assisted work systems are increasingly capable, but their quality often degrades as work becomes larger, more ambiguous, and more collaborative.

The main failure is not only in execution. It often happens earlier:
- the work is not properly clarified,
- planning is rushed or oversimplified,
- context is badly scoped,
- communication between entities is inconsistent,
- model choice is too generic,
- and durable project knowledge is not converted into reusable structure.

Current systems tend to compensate by editing prompts per scenario. This creates prompt drift, inconsistency, and hard-to-maintain quality logic.

The Firm should solve this by providing a Pi-native foundation that lets teams structure AI work through governed context, workflows, protocols, model policy, and durable memory.

---

## 2. Solution
The Firm will be a **Pi-native governed AI work foundation** that allows teams to create and operate project-specific AI systems for planning, execution, and collaboration.

The solution is built from several coordinated layers:
- a Pi-native runtime/core substrate,
- explicit context management,
- dynamic workflow composition with **Archon backwards compatibility**,
- first-class Markdown templates/protocols for communication,
- model policy and fallback configuration,
- durable memory and governance artifacts,
- and meta-creation capabilities for generating new workflows, agents, and templates.

The Firm should remain Pi-native, adopt proven workflow orchestration mechanics where they already work, maintain Archon compatibility for workflow definitions, and differentiate through governance, context, protocols, and memory.

---

## 3. Product Goals

### Primary goals
1. Make AI work more structured, repeatable, and professionally legible.
2. Move quality-critical behavior out of prompt tweaking and into reusable product constructs.
3. Treat context as a first-class managed asset.
4. Support project-specific workflows rather than forcing work into one fixed operating model.
5. Support deliberation before execution for large or ambiguous work.
6. Enable stronger human and agent collaboration through standardized protocols and templates.
7. Preserve durable project and organizational memory.
8. Maintain backwards compatibility with Archon workflows so the community ecosystem is accessible.

### Secondary goals
1. Reuse proven mechanics instead of reinventing them.
2. Selectively adopt valuable capabilities from related Pi-native forks where useful.
3. Create a foundation that can support non-coding workflows as well as coding workflows.

---

## 4. Non-Goals
The Firm is not intended to be:
- a generic orchestration platform for every coding tool;
- a platform-agnostic workflow engine for the whole market;
- a pure knowledge base product;
- a pure coding-agent feature fork with no governance identity;
- a prompt library pretending to be a workflow system.

The Firm should stay Pi-native and governance-first.

---

## 5. Core Product Objects
The Firm should treat the following as first-class concepts:
- **Workflow** — Archon-compatible YAML with The Firm extensions
- **Agent** — a workflow node with identity, permissions, context needs, and output contract
- **Role** — model alias for workflow-level policy
- **Template** — Markdown communication protocol linked to workflow nodes
- **Context profile** — scoped context with type, scope, shape, and lifecycle
- **Model policy** — provider/model references with role aliases and fallback chains
- **Fallback policy** — ordered fallback chain per role
- **Artifact contract** — explicit input/output between workflow phases
- **Engagement type** — classification of incoming work
- **Memory artifact** — promoted durable knowledge

These objects should be explicit, composable, and governable.

---

## 6. Functional Requirements

### 6.1 Pi-native foundation
The product must:
- run natively on The Firm / Pi runtime;
- build the execution engine on **The Firm's own SDK** as the contract layer;
- integrate with existing session, tool, model, and TUI/CLI mechanisms;
- preserve The Firm as a distinct product binary and identity;
- use `~/.the-firm/` as config directory (separate from Pi);
- avoid introducing a product direction that depends on supporting all coding tools equally.

**Acceptance Criteria:**
- [ ] `firm` binary builds successfully on macOS, Linux, and Windows (WSL)
- [ ] `firm --version` returns semantic version matching git tag
- [ ] `~/.the-firm/` directory auto-created on first run with correct permissions (700)
- [ ] The Firm SDK v0.1.0+ published to npm registry as `@digi4care/firm-sdk`
- [ ] SDK exports: `WorkflowEngine`, `ContextProfile`, `AgentRuntime`, `TemplateRenderer`, `ModelPolicy`
- [ ] SDK maintains semver compatibility: minor versions are backwards compatible
- [ ] Integration tests pass with Pi runtime v2.0.0+
- [ ] CLI commands execute without requiring manual Pi configuration

### 6.2 Context management
The product must:
- support explicit management of multiple context types, including at least project, engagement, deliberation, execution, and memory context;
- support scoping context per workflow, role, and phase;
- support context shaping, including summarization, reduction, and transformation into handoff artifacts;
- support context reset/fork boundaries between phases and entities;
- support explicit promotion of selected context into durable memory artifacts;
- support navigation-driven discovery (every directory has a `navigation.md`);
- enforce MVI compliance: context files <200 lines, scannable in <30 seconds.

**Acceptance Criteria:**
- [ ] ContextProfile interface implemented with 4 dimensions (type, scope, shape, lifecycle)
- [ ] All 5 context types (project, engagement, deliberation, execution, memory) creatable via API
- [ ] Context scoping supports workflow, role, and phase filters with AND/OR logic
- [ ] Context shaping produces output <50% of original size for files >100 lines
- [ ] `context fork` command creates isolated copy with new ID and parent reference
- [ ] `navigation.md` auto-generated in each `.firm/` subdirectory, max 20 entries
- [ ] MVI validator warns when files exceed 200 lines or 30-second scan time
- [ ] Context promotion requires explicit user confirmation with promote reason

### 6.3 Dynamic workflows
The product must:
- support dynamic workflows defined from project needs rather than a fixed product-only catalog;
- use **Archon-compatible YAML** as the workflow definition format;
- support workflow definitions with explicit steps/nodes, dependencies, and execution semantics;
- support approval/reject/rework behavior;
- support iterative/looping phases;
- support explicit artifact handoff between phases;
- support workflow resumability and status tracking;
- support **importing Archon workflows** that work directly in The Firm;
- support adding The Firm-specific layers (context profiles, model policy, templates) on top of imported workflows.

**Acceptance Criteria:**
- [ ] Archon YAML workflows execute without modification (backwards compatibility test)
- [ ] Workflow DAG validation detects circular dependencies and fails fast with clear error
- [ ] `firm workflow run <file>` executes workflow and returns exit code 0 on success
- [ ] Workflow state persisted after each node completion to `.firm/workflows/<id>/state.json`
- [ ] `firm workflow resume <id>` restores state and continues from last completed node
- [ ] `firm workflow status <id>` shows: current node, completed nodes, failed nodes (if any)
- [ ] Approval gates pause execution and send notification (TUI or webhook)
- [ ] Reject/rework loops correctly rollback to specified node and preserve audit trail
- [ ] Artifact handoff files are validated against Template schemas before node execution
- [ ] Workflow can be paused with SIGINT and resumed without data loss
- [ ] Max workflow depth: 100 nested sub-workflows (configurable)
- [ ] Import command: `firm workflow import --from-archon <path>` succeeds with validation report

Each workflow node maps to an **agent** with its own definition.

### 6.4 Deliberation workflows
The product must:
- support workflows for intake, brainstorming, scoping, alignment, and role-based planning;
- support planning as a multi-role process instead of assuming it can always be done by one entity;
- support structured pre-execution clarification and approval before implementation workflows begin.

**Acceptance Criteria:**
- [ ] 3+ deliberation workflow templates available: `intake`, `brainstorm`, `plan-review`
- [ ] Multi-role planning supports minimum 2 concurrent agents with merge conflict detection
- [ ] `firm deliberate --template intake` prompts for all required fields from Intake Brief template
- [ ] Deliberation output produces Plan Document artifact before execution phase unlocks
- [ ] Pre-execution approval gate requires explicit human confirmation with `/approve` or CLI `firm approve`
- [ ] Deliberation sessions are logged with full reasoning trace for audit purposes
- [ ] Max deliberation depth: 5 nested clarification rounds (prevents infinite loops)

### 6.5 Agent and role system
The product must:
- support role-aware execution and collaboration;
- support specialist agents or agent profiles for distinct purposes;
- support explicit contracts for what an agent should receive and produce;
- provide every agent with a **structure template** as default with 8 sections: identity, context needs, permissions, model preference, workflow steps, delegation rules, error handling, output contract;
- allow full user override of all defaults;
- support future generation of new agents through a meta-agent creator.

**Acceptance Criteria:**
- [ ] Agent structure template enforces 8 required sections, validates on `firm agent validate`
- [ ] Role resolution: `firm run --role reviewer` maps to model policy and permissions
- [ ] Agent contracts define input schema (Zod) and output schema (Zod) with validation
- [ ] `firm agent create --template <name>` scaffolds agent with all 8 sections pre-filled
- [ ] All 8 template sections are fully user-editable; no locked/hidden fields
- [ ] Agent metadata stored in `.firm/agents/<name>/agent.yaml` with version field
- [ ] Agent can delegate to sub-agents up to depth 3 (configurable)
- [ ] Agent execution timeout: default 5 minutes, configurable per agent

### 6.6 Template and protocol system
The product must:
- support reusable Markdown templates for common artifacts and interactions;
- support communication protocols that standardize handoff between entities;
- provide a curated default set of 6 templates for the initial release:

| Template | Purpose |
|----------|---------|
| Intake brief | New engagement intake |
| Plan document | Plan before building |
| Handoff brief | Phase/agent transitions |
| Review findings | Review results presentation |
| ADR | Architecture decisions |
| Error capture | Recurring error documentation |

- link templates to Archon workflow nodes as protocols;
- support creation of new templates/protocols through a creator mechanism;
- reduce ambiguity in multi-entity collaboration by preferring explicit formats over free-form prompt instructions.

**Acceptance Criteria:**
- [ ] All 6 default templates are Markdown files in `.firm/templates/` with frontmatter schema
- [ ] Template frontmatter includes: `id`, `version`, `protocol` (handoff|review|decision|capture), `required_sections[]`
- [ ] Template validation: `firm template validate <file>` checks required sections and schema
- [ ] Templates linked to workflow nodes via `template: <id>` in YAML workflow definition
- [ ] `firm template create --wizard` interactive wizard generates new template with boilerplate
- [ ] Template rendering replaces `{{variables}}` with context values before handoff
- [ ] Missing required sections in template produce validation error before workflow execution
- [ ] Templates are versioned; workflows can pin to specific template version

### 6.7 Model policy layer
The product must:
- use **`[provider]/[model]`** as the canonical model reference format (e.g. `anthropic/claude-opus`, `openai/gpt-4o`);
- support role aliases that resolve to provider/model references;
- allow per-workflow and per-phase model selection via roles or direct provider/model;
- support fallback model chains per role;
- support provider preferences and project-specific overrides;
- support different model choices for different work types.

**Acceptance Criteria:**
- [ ] Model reference parsing: `provider/model` format validated with regex `^[a-z0-9-]+\/[a-z0-9.-]+$`
- [ ] Role resolution: `creative` → `anthropic/claude-opus` from `.firm/config/model-policy.yaml`
- [ ] Fallback chain: if primary model fails (timeout, rate limit, error), auto-fallback to next in chain
- [ ] Max fallback depth: 3 models per role (configurable)
- [ ] Per-phase model override: `model: fast` in workflow YAML overrides global default
- [ ] Provider preferences: user can set default provider order (e.g., `anthropic > openai > google`)
- [ ] Model health check: `firm model check` validates all configured models are reachable
- [ ] Fallback events logged with timestamp, reason, and latency impact

### 6.8 Durable memory and governance layer
The product must:
- support durable storage of standards, decisions, patterns, errors, guides, references, specs, and templates;
- enforce **artifact lifecycle** with explicit promote/demote: nothing is durable by default;
- support promote criteria: used in multiple sessions, explains a relevant decision, prevents recurring errors, defines a team standard;
- support structured navigation and retrieval of durable memory;
- support `navigation.md` per directory indexing only durable items (max ~20 items per file);
- support workflows that capture new durable knowledge from ongoing work;
- support governance semantics around memory quality and lifecycle.

**Acceptance Criteria:**
- [ ] Artifact lifecycle states: `ephemeral` → `session` → `durable` → `archive` with explicit transitions
- [ ] Promotion requires 2+ criteria met: multi-use, decision explanation, error prevention, or standard definition
- [ ] `firm promote <artifact> --reason "..."` moves artifact to durable with audit trail
- [ ] `navigation.md` auto-updated when artifacts promoted/demoted, max 20 entries enforced
- [ ] Durable artifacts stored in `.firm/memory/` with metadata: created, promoted, usage_count, last_accessed
- [ ] `firm memory search <query>` returns relevant durable artifacts ranked by relevance + recency
- [ ] Memory cleanup: `firm memory archive --older-than 90d` moves stale items to archive
- [ ] Governance dashboard: `firm memory status` shows counts per lifecycle state

### 6.9 Context operations
The product must support both interactive and CLI-based context operations:

**Agent commands (in-session):**
- `/firm:extract`, `/firm:capture`, `/firm:compact`, `/firm:harvest`, `/firm:map`, `/firm:validate`

**CLI commands (scriptable):**

| Command | AI needed | What it does |
|---------|-----------|-------------|
| `firm init` | No | Scaffold .firm/ |
| `firm map` | No | Show structure |
| `firm validate` | No | Check MVI compliance |
| `firm extract` | Yes | Distill knowledge from sources |
| `firm harvest` | Yes | Summaries → durable context |
| `firm capture` | Yes | Recognize patterns/errors |
| `firm compact` | Yes | Create compacted version |
| `firm scan` | Yes | Analyze project |

`firm extract` must support multiple source types:
- Local files and directories
- URLs
- GitHub repositories (with `--focus` option)
- GitLab repositories

**Acceptance Criteria:**
- [ ] In-session commands (`/firm:extract`, `/firm:capture`, etc.) available in TUI with autocomplete
- [ ] CLI commands return appropriate exit codes: 0=success, 1=validation error, 2=runtime error, 3=AI unavailable
- [ ] `firm init` scaffolds complete `.firm/` directory structure with sample files
- [ ] `firm map` outputs JSON or human-readable tree with file counts per directory
- [ ] `firm validate` checks: MVI compliance, required files present, YAML syntax, template schema compliance
- [ ] `firm extract --from <url>` fetches and distills content into structured output with source attribution
- [ ] `firm extract --from github.com/org/repo --focus packages/core` respects focus path
- [ ] `firm harvest` requires confirmation before promoting to durable memory
- [ ] `firm capture` recognizes at least 5 pattern types: error patterns, anti-patterns, conventions, decisions, dependencies
- [ ] `firm compact` reduces content to ≤40% of original while preserving key information
- [ ] `firm scan` outputs: project type detection, workflow coverage, memory health, recommendations
- [ ] All CLI commands support `--json` flag for machine-readable output
- [ ] All CLI commands support `--dry-run` flag where applicable

### 6.10 Meta-creation capabilities
The product should support:
- agent creation from templates (`firm agent create --template reviewer`) or interactive wizard;
- workflow creation from templates, Archon import, or interactive wizard;
- template/protocol creation through a creator workflow;
- eventually, composition of AI systems for AI work from within The Firm itself.

**Acceptance Criteria:**
- [ ] `firm agent create --template <name>` scaffolds agent with all 8 structure sections
- [ ] `firm agent create --wizard` interactive wizard asks for: name, purpose, role, model preference
- [ ] `firm workflow create --template <name>` generates Archon-compatible YAML with Firm extensions
- [ ] `firm workflow create --from-archon <path>` imports and validates Archon workflow
- [ ] `firm workflow create --wizard` interactive wizard for workflow design
- [ ] `firm template create --wizard` generates new template with protocol selection and section prompts
- [ ] All created artifacts pass `firm validate` without errors
- [ ] Meta-creation commands support `--output` flag to specify destination directory
- [ ] Created agents are immediately runnable via `firm run <agent-name>`
- [ ] Wizard flows can be exited with partial progress saved to `.firm/.drafts/`

---

## 7. User and System Stories

1. As a team using The Firm, I want AI work to be governed by explicit workflows, so that output quality is more repeatable.
2. As a project lead, I want workflows to reflect what my project needs now, so that we are not forced into tool-predefined patterns.
3. As a planner, I want deliberation before execution, so that large and ambiguous requests are clarified before implementation starts.
4. As an architect, I want durable decisions, standards, and patterns to be stored in a structured system, so that future AI and human work can reuse them.
5. As a reviewer, I want handoff and review formats to be standardized, so that communication is low-ambiguity.
6. As a workflow author, I want to specify model choices and fallback behavior per workflow and phase, so that different work types use appropriate models.
7. As a project team, I want context to be scoped intentionally per role and phase, so that entities receive the right context and avoid overload.
8. As a The Firm user, I want coding workflows to feel native inside the Pi/The Firm environment, so that the product remains coherent and deeply integrated.
9. As a The Firm user, I want non-coding workflows such as brainstorming or SEO content flows to also be possible, so that the same governed foundation can support broader AI work.
10. As a platform designer, I want The Firm to support creation of new workflows, agents, and protocols, so that the system can evolve with the project instead of being frozen to initial defaults.
11. As an operator, I want The Firm to distinguish transient session context from durable memory, so that not everything becomes permanent noise.
12. As a user, I want approval and rejection loops to be first-class, so that humans can guide important work without rewriting prompts.
13. As an entity participating in a workflow, I want my expected input and output contracts to be explicit, so that handoffs are predictable.
14. As a maintainer of the product fork, I want core changes to remain intentional and Pi-native, so that The Firm stays maintainable and coherent.
15. As a workflow author, I want to import Archon community workflows and extend them with The Firm extras, so that I don't have to start from scratch.

---

## 8. Product Capabilities by Area

### A. Foundation
- Pi-native runtime integration via The Firm SDK
- stable extension seams
- session/tool/model integration
- The Firm product identity (binary, package, directory)

### B. Context
- context typing/scoping (ContextProfile with 4 dimensions)
- context shaping and compaction (MVI compliance)
- context handoff between roles/phases
- context persistence rules (lifecycle)
- navigation-driven discovery

### C. Workflows
- Archon-compatible YAML workflows
- DAG-style execution
- approvals and loops
- artifacts and run state
- resumability and isolation
- Archon import support

### D. Agents and roles
- agents as workflow nodes
- structure template defaults (8 sections)
- specialist roles
- full user override
- future meta-agent creation

### E. Templates and protocols
- 6 default templates for initial release
- templates linked to workflow nodes
- communication standards
- handoff/review/approval formats
- protocol creator capability

### F. Model policy
- `[provider]/[model]` format
- role aliases
- workflow-level model mapping
- phase-level overrides
- fallback chains
- project-specific model strategy

### G. Memory and governance
- artifact lifecycle (ephemeral → session → durable → archive)
- promote/demote with criteria
- navigation files indexing durable items only
- standards/decisions/patterns/errors/references/specs/templates

### H. Context operations
- interactive commands (`/firm:extract`, `/firm:harvest`, etc.)
- CLI commands (firm extract, firm harvest, etc.)
- multi-source extract (local, URL, GitHub, GitLab)

### I. Meta-creation
- create agents from template or wizard
- create workflows from template, import, or wizard
- create templates/protocols
- build AI systems for AI work

---

## 9. Architectural/Product Constraints

1. The Firm must remain Pi-native.
2. The Firm SDK is the contract between runtime and product layers.
3. Workflow orchestration must maintain Archon backwards compatibility.
4. Product differentiation should focus on governance, context, memory, protocol, and model policy.
5. The Firm should support coding-first use today without closing off broader AI-work workflows.
6. Core growth should remain intentional to avoid unnecessary divergence and maintenance burden.
7. Defaults are opiniated best practices; everything is user-overridable.
8. No bundles — flat type-based directory structure in `.firm/`.
9. Config directory is `~/.the-firm/`, separate from Pi.

---

## 10. Non-Functional Requirements

The product should:
- remain understandable as a layered system rather than a bag of features;
- preserve clear boundaries between substrate, workflow mechanics, and governance semantics;
- support reliable, inspectable, resumable workflow execution;
- make communication contracts legible to both humans and AI entities;
- support maintainability of the fork over time;
- support gradual adoption rather than requiring all layers to be built at once.

### 10.1 Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| Workflow start-up | <2s for workflows with <50 nodes | Responsive developer experience |
| Context switch between nodes | <500ms | Minimal latency in multi-agent flows |
| `firm map` on large project (1000+ files) | <3s | Usable on real-world projects |
| `firm validate` per file | <1s | Fast feedback loop |
| Template rendering | <200ms | No perceivable delay |
| Memory per agent | Configurable, default 512MB | Reasonable for LLM context windows |
| Concurrent workflows | Up to 5 simultaneous (configurable) | Multi-tasking support |
| State persistence | <100ms per node completion | Non-blocking state saves |

### 10.2 Reliability Requirements

- Workflow state must survive process crash (SIGKILL, OOM)
- Model fallback must complete within 30 seconds of primary failure
- `firm validate` must never produce false positives (strict mode)
- CLI commands must handle network failures gracefully with retry logic

### 10.3 Security Requirements

| Area | Requirement |
|------|-------------|
| **API keys** | Stored in `~/.the-firm/config.json` with 600 permissions; never logged or included in artifacts |
| **Secret scanning** | `firm validate` warns if API keys or tokens detected in `.firm/` files |
| **PII detection** | Optional scan before promoting to durable memory (opt-in) |
| **Workflow isolation** | Each workflow runs in isolated context; agents cannot access other workflows' state |
| **Model communication** | All model API calls over HTTPS; no plaintext credentials |
| **Memory access** | Future: role-based access control for durable memory artifacts |
| **Audit trail** | All promote/demote/approve/reject actions logged with timestamp and actor |

### 10.4 Maintainability Requirements

- Code follows Pi's existing contribution patterns
- All new modules have TypeScript types exported
- Breaking changes to SDK require minor version bump + migration guide
- Documentation updates are part of the definition of done for each phase

---

## 11. Phased Delivery Direction

### Phase 1 — Core identity and substrate
- stabilize The Firm as a Pi-native product fork
- establish The Firm SDK as the contract layer
- establish boundaries and extension seams
- preserve or improve core runtime usability
- set up `~/.the-firm/` config directory

**Exit Criteria:**
- [ ] `firm` binary builds on macOS, Linux, Windows (WSL)
- [ ] `firm --version` returns semantic version
- [ ] `~/.the-firm/` auto-created on first run
- [ ] `@digi4care/firm-sdk` v0.1.0 published to npm
- [ ] Core SDK exports usable: `WorkflowEngine`, `ContextProfile`, `AgentRuntime`
- [ ] Integration tests pass with Pi runtime v2.0.0+

---

### Phase 2 — Context and governance foundation
- implement ContextProfile with 4 dimensions
- implement navigation-driven discovery
- enforce MVI compliance for context files
- formalize 6 default templates linked to workflow nodes
- establish `.firm/` directory structure

**Exit Criteria:**
- [ ] ContextProfile interface implemented with all 4 dimensions
- [ ] `firm init` scaffolds `.firm/` directory structure with `navigation.md` in each subdirectory
- [ ] `firm validate --mvi` checks line limits and scan time
- [ ] All 6 default templates created in `.firm/templates/` with frontmatter schema
- [ ] `firm template validate <file>` validates template structure
- [ ] `navigation.md` auto-generated and maintained

---

### Phase 3 — Workflow adoption
- implement Archon-compatible YAML workflow engine
- support Archon workflow import
- integrate artifact/approval/loop semantics
- add The Firm layers (context profiles, templates) on top

**Exit Criteria:**
- [ ] Archon YAML workflows execute without modification
- [ ] `firm workflow run <file>` executes workflow end-to-end
- [ ] `firm workflow resume <id>` restores state after interruption
- [ ] `firm workflow import --from-archon <path>` imports with validation report
- [ ] Approval gates pause and resume correctly
- [ ] Artifact handoff validated against template schemas
- [ ] DAG validation detects circular dependencies

---

### Phase 4 — Model and role policies
- implement `[provider]/[model]` format
- implement role aliases with fallback chains
- support role-based execution contracts

**Exit Criteria:**
- [ ] Model references parsed in `provider/model` format
- [ ] Role aliases resolved from `.firm/config/model-policy.yaml`
- [ ] Fallback chains tested with simulated provider failures
- [ ] `firm model check` validates all configured models are reachable
- [ ] Per-phase model override works in workflow YAML
- [ ] Fallback events logged with timestamp, reason, latency

---

### Phase 5 — Meta-creation
- support creating agents from templates and wizard
- support creating workflows from templates, import, and wizard
- support creating templates/protocols

**Exit Criteria:**
- [ ] `firm agent create --template <name>` scaffolds agent with 8 sections
- [ ] `firm agent create --wizard` interactive wizard produces valid agent
- [ ] `firm workflow create --template <name>` generates Archon-compatible YAML
- [ ] `firm template create --wizard` generates valid template
- [ ] All created artifacts pass `firm validate`
- [ ] Created agents are immediately runnable

---

### Phase 6 — Developer aids (deferred)
- machine-readable agent manifests
- agent compatibility checker
- context health dashboard
- eval framework

**Exit Criteria:** (deferred — define when phase is activated)
- [ ] Agent manifests are machine-readable JSON/YAML
- [ ] Compatibility checker validates agent↔workflow compatibility
- [ ] Dashboard shows context health metrics
- [ ] Eval framework supports automated quality scoring

---

## 12. Out of Scope for Now

- a generic all-tools orchestration platform;
- full support for every external coding environment;
- broad multi-platform adapter ambitions beyond what fits The Firm's Pi-native focus;
- replacing the need for human judgment in ambiguous or politically sensitive planning;
- building every potential workflow domain immediately;
- machine-readable agent manifests as part of the core product model;
- visual workflow builders;
- plugin marketplace.

---

## 13. Resolved Design Questions

### Q1: Workflow orchestration — adopt vs adapt?
**Answer:** Adopt Archon's workflow concepts directly. Build the execution engine on **The Firm's own SDK**. The Firm SDK is the contract, Pi is the runtime underneath. Backwards compatibility with Archon workflows is a hard requirement.

### Q2: First-class context object model
**Answer:** A ContextProfile has 4 dimensions: Type (what), Scope (who), Shape (form), Lifecycle (duration). Navigation-driven discovery with MVI compliance.

### Q3: Default templates/protocols for initial release
**Answer:** 6 templates covering the full delivery cycle, linked to Archon workflow nodes: intake brief, plan document, handoff brief, review findings, ADR, error capture. Archon backwards compatibility ensures community workflows work directly.

### Q4: Model categories/roles for workflow-level policy
**Answer:** Always `[provider]/[model]` format. Roles are aliases resolved via project config. Workflows refer to roles or directly to provider/model.

### Q5: Agent and workflow creation
**Answer:** Templates + interactive wizard. Every agent gets a structure template with 8 best-practice sections. Everything overrideable. Archon import for workflows.

### Q6: Durable memory without document sprawl
**Answer:** Artifact lifecycle with explicit promote/demote. Nothing durable by default. Navigation files index durable items only.

### Q7: Naming conventions
**Answer:** Directory-based, no prefixes. `.firm/` organized by type (agents/, commands/, templates/, context/, workflows/, memory/, config/). `firm <verb>` CLI. `~/.the-firm/` config directory.

### Q8: Optional internal developer aids
**Answer:** Four deferred items: agent manifests, compat checker, context health dashboard, eval framework.

---

## 14. Closing Statement

The Firm should become a Pi-native foundation for designing and operating AI systems
for AI work, where context, workflows, roles, protocols, model policy, and memory are
explicit, governed, and reusable. Archon compatibility ensures the community workflow
ecosystem is accessible. The Firm SDK is the contract. Opiniated defaults with full
override make quality available out of the box without locking anyone in.

## Appendix A: The Firm SDK Specification

The Firm SDK is the formal contract between the Pi-native runtime and The Firm product layers.

### Package Information
- **Package name:** `@digi4care/firm-sdk`
- **Versioning:** SemVer, synchronized with `firm` binary releases
- **Node.js support:** `>=18.0.0`
- **License:** MIT

### Core Exports

```typescript
// Main entry point
export { WorkflowEngine } from './workflow/engine';
export { ContextProfile } from './context/profile';
export { AgentRuntime } from './agent/runtime';
export { TemplateRenderer } from './template/renderer';
export { ModelPolicy } from './model/policy';

// Types
export type { 
  WorkflowDefinition, 
  WorkflowNode, 
  WorkflowState,
  ContextType,
  ContextScope,
  ContextShape,
  ContextLifecycle,
  AgentConfig,
  AgentStructure,
  TemplateSchema,
  ModelRole,
  ModelFallback
} from './types';
```

### Key Interfaces

#### WorkflowEngine
```typescript
class WorkflowEngine {
  constructor(config: EngineConfig);
  load(definition: WorkflowDefinition): WorkflowInstance;
  importArchon(yamlPath: string): WorkflowDefinition;
  validate(definition: WorkflowDefinition): ValidationResult;
}
```

#### ContextProfile
```typescript
interface ContextProfile {
  type: 'project' | 'engagement' | 'deliberation' | 'execution' | 'memory';
  scope: {
    workflow?: string;
    role?: string;
    phase?: string;
  };
  shape: 'full' | 'summary' | 'extract' | 'reference';
  lifecycle: 'ephemeral' | 'session' | 'durable' | 'archive';
}
```

#### AgentStructure (8 sections)
```typescript
interface AgentStructure {
  identity: string;           // Who is this agent
  contextNeeds: string[];     // What context does it need
  permissions: string[];      // What can it do
  modelPreference: string;    // [provider]/[model] or role
  workflow: string;           // Default workflow or pattern
  delegationRules: string[];  // When to delegate
  errorHandling: string;      // How to handle failures
  outputContract: string;     // Expected output format
}
```

---

## Appendix B: MVI (Minimum Viable Information) Compliance

### Definition
MVI is a readability standard ensuring information can be consumed quickly without cognitive overload. It applies to all context files, templates, and memory artifacts stored in `.firm/`.

### Standards

| Metric | Limit | Rationale |
|--------|-------|-----------|
| **Lines per file** | ≤200 | Fits on screen without scrolling |
| **Scan time** | ≤30 seconds | Human working memory threshold |
| **Sections per document** | ≤7 | Miller's Law: 7±2 items |
| **Nesting depth** | ≤3 | Easy navigation |
| **Line length** | ≤100 chars | Readable without horizontal scroll |

### Validation
```bash
# Check MVI compliance
firm validate --mvi

# Output includes:
# - Files exceeding 200 lines
# - Documents with >7 sections
# - Lines exceeding 100 characters
# - Estimated scan time per file
```

### Exceptions
MVI compliance can be explicitly waived per file:
```yaml
---
mvi: false
reason: "Generated API reference; not intended for human reading"
---
```

---

## Appendix C: Default Templates Specification

### C.1 Intake Brief
**Protocol:** `intake`  
**Purpose:** Capture new engagement requirements  
**Required Sections:**
1. **Request Summary** — One-line description of the ask
2. **Context** — Background information and current state
3. **Acceptance Criteria** — What "done" looks like
4. **Constraints** — Time, budget, technical, or policy limits
5. **Stakeholders** — Who needs to be involved/consulted
6. **Priority & Urgency** — Business impact and timeline
7. **Unknowns & Risks** — What needs clarification

**Frontmatter:**
```yaml
---
id: intake-brief
version: 1.0.0
protocol: intake
required_sections: [summary, context, criteria, constraints, stakeholders, priority, risks]
---
```

---

### C.2 Plan Document
**Protocol:** `plan`  
**Purpose:** Define approach before implementation  
**Required Sections:**
1. **Objective** — What this plan will achieve
2. **Approach** — High-level strategy and rationale
3. **Phases & Milestones** — Breakdown of work stages
4. **Dependencies** — What must happen first
5. **Resources & Roles** — Who does what
6. **Risks & Mitigations** — What could go wrong
7. **Success Criteria** — How to validate completion

**Frontmatter:**
```yaml
---
id: plan-document
version: 1.0.0
protocol: plan
required_sections: [objective, approach, phases, dependencies, resources, risks, success]
---
```

---

### C.3 Handoff Brief
**Protocol:** `handoff`  
**Purpose:** Transfer work between phases or agents  
**Required Sections:**
1. **Completed Work** — What was done
2. **Current State** — Where things stand now
3. **Decisions Made** — Key choices with rationale
4. **Open Issues** — What remains unresolved
5. **Next Steps** — What the recipient should do
6. **Context for Recipient** — What they need to know

**Frontmatter:**
```yaml
---
id: handoff-brief
version: 1.0.0
protocol: handoff
required_sections: [completed, state, decisions, issues, next, context]
---
```

---

### C.4 Review Findings
**Protocol:** `review`  
**Purpose:** Present review results systematically  
**Required Sections:**
1. **Scope** — What was reviewed
2. **Methodology** — How the review was conducted
3. **Findings** — Issues discovered, categorized by severity
4. **Recommendations** — Specific actions to address issues
5. **Acceptance** — What passes muster
6. **Follow-up Required** — What needs additional work

**Severity Labels:**
- 🔴 **Critical** — Blocks release, fix immediately
- 🟠 **Major** — Significant impact, fix before merge
- 🟡 **Minor** — Should fix, not blocking
- 🟢 **Info** — Observation, no action required

**Frontmatter:**
```yaml
---
id: review-findings
version: 1.0.0
protocol: review
required_sections: [scope, methodology, findings, recommendations, acceptance, followup]
severity_levels: [critical, major, minor, info]
---
```

---

### C.5 Architecture Decision Record (ADR)
**Protocol:** `decision`  
**Purpose:** Capture significant architectural choices  
**Required Sections:**
1. **Context** — Forces shaping the decision
2. **Decision** — What was decided
3. **Consequences** — Positive, negative, and neutral impacts
4. **Alternatives Considered** — Other options and why rejected
5. **Related Decisions** — Links to other ADRs

**Frontmatter:**
```yaml
---
id: adr-template
version: 1.0.0
protocol: decision
required_sections: [context, decision, consequences, alternatives, related]
status: proposed | accepted | deprecated | superseded
---
```

---

### C.6 Error Capture
**Protocol:** `capture`  
**Purpose:** Document recurring errors and their solutions  
**Required Sections:**
1. **Error Pattern** — Description of the recurring error
2. **Symptoms** — How to recognize it
3. **Root Cause** — Why it happens
4. **Solution** — How to fix it
5. **Prevention** — How to avoid it in future
6. **Related Errors** — Similar or cascading issues

**Frontmatter:**
```yaml
---
id: error-capture
version: 1.0.0
protocol: capture
required_sections: [pattern, symptoms, cause, solution, prevention, related]
error_codes: []  # Optional: linked error codes
---
```

---

## Appendix D: CLI Command Reference

### Command Summary

| Command | Exit Codes | Flags |
|---------|-----------|-------|
| `firm init` | 0=success, 1=exists | `--force`, `--template` |
| `firm map` | 0=success, 2=error | `--json`, `--depth` |
| `firm validate` | 0=pass, 1=fail | `--mvi`, `--strict` |
| `firm extract` | 0=success, 2=error, 3=AI unavailable | `--from`, `--focus`, `--output` |
| `firm harvest` | 0=success, 1=promote rejected | `--dry-run`, `--auto-promote` |
| `firm capture` | 0=success, 2=error | `--pattern-type`, `--output` |
| `firm compact` | 0=success | `--ratio`, `--format` |
| `firm scan` | 0=success | `--json`, `--detail` |
| `firm workflow run` | 0=success, 1=validation, 2=runtime | `--resume`, `--dry-run` |
| `firm workflow status` | 0=running, 1=completed, 2=failed, 3=not found | `--json` |

### Global Flags
All commands support:
- `--json` — Machine-readable JSON output
- `--dry-run` — Show what would happen without executing
- `--verbose` / `-v` — Detailed logging
- `--quiet` / `-q` — Suppress non-error output
- `--config <path>` — Use alternative config file

---

*End of Document*
