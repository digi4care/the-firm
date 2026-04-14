# Hexagonal Architecture Foundation — Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce hexagonal architecture (ports & adapters) to The Firm by creating a pure domain package and a ports package, then wiring the first use case (`firm map`) through the new architecture as a proof of concept.

**Architecture:** Hexagonal (Ports & Adapters). A new `packages/domain/` contains zero-dependency business logic. A new `packages/ports/` defines inbound (use case) and outbound (infrastructure) interfaces. Existing packages become adapters implementing those ports. Dependencies always point inward: adapters → ports → domain.

**Tech Stack:** TypeScript, Vitest, @sinclair/typebox (existing), npm workspaces (existing monorepo).

## Architectural Decisions

- **Package naming:** `@digi4care/the-firm-domain` (pure domain), `@digi4care/the-firm-ports` (interfaces). No existing packages are renamed.
- **Dependency direction:** `domain` has ZERO external dependencies (only std lib types). `ports` depends only on `domain`. All other packages depend on `ports` (and transitively `domain`).
- **Value objects over classes:** Domain types are immutable value objects (type aliases + factory functions + pure functions). No classes with state, no side effects.
- **Coexistence strategy:** New architecture runs alongside existing code. No breaking changes. First use case (`firm map`) proves the pattern; subsequent PRD phases adopt it incrementally.
- **Test strategy:** Domain layer has 100% unit test coverage (pure functions, no mocks needed). Ports are tested via test doubles. Adapters are tested with integration tests.
- **File organization:** Each domain concept gets its own file. Each port gets its own file. Max 200 lines per file (MVI-compliant).

---

## File Structure (new files only)

```
packages/
├── domain/                              ← NEW PACKAGE
│   ├── package.json
│   ├── tsconfig.build.json
│   ├── vitest.config.ts
│   ├── src/
│   │   ├── index.ts                     ← barrel export
│   │   ├── context/
│   │   │   ├── context-profile.ts       ← ContextProfile value object
│   │   │   ├── context-scope.ts         ← ContextScope type + combinators
│   │   │   ├── context-type.ts          ← ContextType enum
│   │   │   ├── context-shape.ts         ← ContextShape enum
│   │   │   └── context-lifecycle.ts     ← ContextLifecycle enum + transitions
│   │   ├── memory/
│   │   │   ├── memory-artifact.ts       ← MemoryArtifact value object
│   │   │   ├── artifact-lifecycle.ts    ← Lifecycle state machine
│   │   │   └── promote-criteria.ts      ← Promotion rule engine (pure)
│   │   ├── workflow/
│   │   │   ├── workflow-definition.ts   ← WorkflowDefinition value object
│   │   │   ├── workflow-node.ts         ← WorkflowNode types
│   │   │   └── dag-validator.ts         ← Cycle detection (pure)
│   │   ├── agent/
│   │   │   ├── agent-structure.ts       ← AgentStructure (8 sections)
│   │   │   └── agent-mode.ts            ← AgentMode enum (primary/subagent/leaf)
│   │   ├── model/
│   │   │   ├── model-reference.ts       ← provider/model parsing & validation
│   │   │   ├── model-role.ts            ← Role alias types
│   │   │   └── fallback-chain.ts        ← Fallback chain resolution (pure)
│   │   ├── template/
│   │   │   ├── template.ts              ← Template value object
│   │   │   └── protocol-type.ts         ← Protocol enum
│   │   ├── engagement/
│   │   │   └── engagement-type.ts       ← EngagementType classification
│   │   ├── mvi/
│   │   │   ├── mvi-rules.ts             ← MVI validation rules (pure)
│   │   │   └── file-info.ts             ← FileInfo value object
│   │   ├── directory-map/
│   │   │   └── directory-map.ts         ← DirectoryMap value object + construction
│   │   └── shared/
│   │       └── branded-types.ts         ← Branded type helpers
│   └── test/
│       ├── context/
│       │   ├── context-profile.test.ts
│       │   ├── context-lifecycle.test.ts
│       │   └── context-scope.test.ts
│       ├── memory/
│       │   ├── artifact-lifecycle.test.ts
│       │   └── promote-criteria.test.ts
│       ├── workflow/
│       │   └── dag-validator.test.ts
│       ├── model/
│       │   ├── model-reference.test.ts
│       │   └── fallback-chain.test.ts
│       ├── agent/
│       │   └── agent-structure.test.ts
│       ├── template/
│       │   └── template.test.ts
│       ├── mvi/
│       │   └── mvi-rules.test.ts
│       └── directory-map/
│           └── directory-map.test.ts
│
├── ports/                               ← NEW PACKAGE
│   ├── package.json
│   ├── tsconfig.build.json
│   ├── src/
│   │   ├── index.ts                     ← barrel export
│   │   ├── inbound/
│   │   │   ├── context-manager.ts       ← ContextManagerPort (extract, harvest, etc.)
│   │   │   ├── workflow-runner.ts       ← WorkflowRunnerPort (run, resume, status)
│   │   │   ├── directory-mapper.ts      ← DirectoryMapperPort (firm map)
│   │   │   └── mvi-validator.ts         ← MviValidatorPort (firm validate)
│   │   └── outbound/
│   │       ├── filesystem.ts            ← FileSystemPort
│   │       ├── session-store.ts         ← SessionStorePort
│   │       ├── event-bus.ts             ← EventBusPort
│   │       └── ai-provider.ts           ← AIProviderPort
│   └── test/
│       └── ports-contract.test.ts       ← Verify ports reference only domain types
│
├── coding-agent/                        ← MODIFIED: add adapter + use case
│   ├── src/
│   │   ├── adapters/                    ← NEW
│   │   │   ├── node-filesystem.ts       ← FileSystemPort implementation
│   │   │   └── directory-mapper-service.ts ← DirectoryMapperPort implementation
│   │   └── ...
│   └── test/
│       └── adapters/
│           ├── node-filesystem.test.ts
│           └── directory-mapper-service.test.ts
```

---

## Task 1: Create the `domain` package skeleton

**Files:**
- Create: `packages/domain/package.json`
- Create: `packages/domain/tsconfig.build.json`
- Create: `packages/domain/vitest.config.ts`
- Create: `packages/domain/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@digi4care/the-firm-domain",
  "version": "0.0.1",
  "description": "Pure domain layer for The Firm — zero external dependencies, no I/O",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md"],
  "scripts": {
    "clean": "shx rm -rf dist",
    "build": "tsgo -p tsconfig.build.json",
    "dev": "tsgo -p tsconfig.build.json --watch --preserveWatchOutput",
    "test": "vitest --run",
    "prepublishOnly": "npm run clean && npm run build"
  },
  "dependencies": {},
  "devDependencies": {
    "shx": "^0.4.0",
    "vitest": "^3.1.1"
  },
  "keywords": ["domain", "business-logic", "hexagonal"],
  "author": "digi4care",
  "license": "MIT"
}
```

- [ ] **Step 2: Create tsconfig.build.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.d.ts", "src/**/*.d.ts"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create empty barrel export**

```typescript
// packages/domain/src/index.ts
/**
 * The Firm Domain Layer
 *
 * Pure business logic — zero external dependencies, no I/O.
 * All types are immutable value objects.
 * All functions are pure (no side effects).
 *
 * Hexagonal architecture: this is the innermost ring.
 */
```

- [ ] **Step 5: Install dependencies**

Run: `cd /home/digi4care/projects/the-firm && npm install`

- [ ] **Step 6: Verify package builds**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm run build`
Expected: Clean build, no errors

- [ ] **Step 7: Commit**

```bash
git add packages/domain/package.json packages/domain/tsconfig.build.json packages/domain/vitest.config.ts packages/domain/src/index.ts package.json package-lock.json
git commit -m "feat(domain): create domain package skeleton with zero dependencies"
```

---

## Task 2: Domain — Branded types and shared primitives

**Files:**
- Create: `packages/domain/src/shared/branded-types.ts`
- Create: `packages/domain/test/shared/branded-types.test.ts`

- [ ] **Step 1: Write failing test for branded types**

```typescript
// packages/domain/test/shared/branded-types.test.ts
import { describe, it, expect } from 'vitest';
import { brand, type Branded } from '../../src/shared/branded-types.js';

type ArtifactId = Branded<string, 'ArtifactId'>;
const artifactId = brand<string, 'ArtifactId'>;

type WorkflowId = Branded<string, 'WorkflowId'>;
const workflowId = brand<string, 'WorkflowId'>;

describe('branded types', () => {
  it('creates a branded value from string', () => {
    const id = artifactId('art-001');
    expect(id).toBe('art-001');
  });

  it('preserves string operations on branded values', () => {
    const id = artifactId('art-001');
    expect(id.length).toBe(7);
    expect(id.toUpperCase()).toBe('ART-001');
  });

  it('different branded types are not assignable at compile time', () => {
    const a = artifactId('a');
    const w = workflowId('a');
    // Runtime values are equal, types are different
    expect(a).toBe(w);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: FAIL — module not found

- [ ] **Step 3: Implement branded types**

```typescript
// packages/domain/src/shared/branded-types.ts
/**
 * Branded type utility for nominal typing in TypeScript.
 *
 * Creates types that are structurally identical to their base
 * but distinguishable at compile time. No runtime overhead.
 */

export type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

/**
 * Brand a value with a nominal type.
 * Zero runtime cost — just a type assertion.
 */
export function brand<T, Brand extends string>(value: T): Branded<T, Brand> {
  return value as Branded<T, Brand>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: PASS

- [ ] **Step 5: Export from barrel**

Add to `packages/domain/src/index.ts`:
```typescript
export { brand, type Branded } from './shared/branded-types.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/shared/branded-types.ts packages/domain/test/shared/branded-types.test.ts packages/domain/src/index.ts
git commit -m "feat(domain): add branded type utility for nominal typing"
```

---

## Task 3: Domain — ContextProfile value object

**Files:**
- Create: `packages/domain/src/context/context-type.ts`
- Create: `packages/domain/src/context/context-shape.ts`
- Create: `packages/domain/src/context/context-scope.ts`
- Create: `packages/domain/src/context/context-lifecycle.ts`
- Create: `packages/domain/src/context/context-profile.ts`
- Create: `packages/domain/test/context/context-profile.test.ts`
- Create: `packages/domain/test/context/context-lifecycle.test.ts`
- Create: `packages/domain/test/context/context-scope.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/domain/test/context/context-profile.test.ts
import { describe, it, expect } from 'vitest';
import {
  createContextProfile,
  type ContextProfile,
} from '../../src/context/context-profile.js';
import { ContextType } from '../../src/context/context-type.js';
import { ContextShape } from '../../src/context/context-shape.js';
import { ContextLifecycle } from '../../src/context/context-lifecycle.js';

describe('ContextProfile', () => {
  it('creates a profile with all dimensions', () => {
    const profile = createContextProfile({
      type: ContextType.Project,
      scope: { workflow: 'build', role: undefined, phase: undefined },
      shape: ContextShape.Full,
      lifecycle: ContextLifecycle.Session,
    });

    expect(profile.type).toBe(ContextType.Project);
    expect(profile.scope.workflow).toBe('build');
    expect(profile.shape).toBe(ContextShape.Full);
    expect(profile.lifecycle).toBe(ContextLifecycle.Session);
  });

  it('withScope returns new profile with merged scope', () => {
    const original = createContextProfile({
      type: ContextType.Engagement,
      scope: { workflow: 'plan', role: undefined, phase: undefined },
      shape: ContextShape.Summary,
      lifecycle: ContextLifecycle.Ephemeral,
    });

    const updated = original.withScope({ role: 'reviewer' });

    expect(updated.scope.role).toBe('reviewer');
    expect(updated.scope.workflow).toBe('plan'); // preserved
    expect(original.scope.role).toBeUndefined(); // immutable
  });

  it('promote transitions ephemeral → session → durable', () => {
    const ephemeral = createContextProfile({
      type: ContextType.Execution,
      scope: {},
      shape: ContextShape.Extract,
      lifecycle: ContextLifecycle.Ephemeral,
    });

    const session = ephemeral.promote();
    expect(session.lifecycle).toBe(ContextLifecycle.Session);
    expect(ephemeral.lifecycle).toBe(ContextLifecycle.Ephemeral); // immutable

    const durable = session.promote();
    expect(durable.lifecycle).toBe(ContextLifecycle.Durable);
  });

  it('isDurable returns true only for durable lifecycle', () => {
    const durable = createContextProfile({
      type: ContextType.Memory,
      scope: {},
      shape: ContextShape.Reference,
      lifecycle: ContextLifecycle.Durable,
    });
    expect(durable.isDurable()).toBe(true);

    const session = durable.demote();
    expect(session.isDurable()).toBe(false);
  });
});
```

```typescript
// packages/domain/test/context/context-lifecycle.test.ts
import { describe, it, expect } from 'vitest';
import {
  ContextLifecycle,
  canPromote,
  canDemote,
  nextLifecycle,
  previousLifecycle,
} from '../../src/context/context-lifecycle.js';

describe('ContextLifecycle', () => {
  it('has four states in order', () => {
    expect(ContextLifecycle.Ephemeral).toBe('ephemeral');
    expect(ContextLifecycle.Session).toBe('session');
    expect(ContextLifecycle.Durable).toBe('durable');
    expect(ContextLifecycle.Archive).toBe('archive');
  });

  it('canPromote is true for ephemeral, session, durable', () => {
    expect(canPromote(ContextLifecycle.Ephemeral)).toBe(true);
    expect(canPromote(ContextLifecycle.Session)).toBe(true);
    expect(canPromote(ContextLifecycle.Durable)).toBe(false);
    expect(canPromote(ContextLifecycle.Archive)).toBe(false);
  });

  it('canDemote is true for session, durable, archive', () => {
    expect(canDemote(ContextLifecycle.Ephemeral)).toBe(false);
    expect(canDemote(ContextLifecycle.Session)).toBe(true);
    expect(canDemote(ContextLifecycle.Durable)).toBe(true);
    expect(canDemote(ContextLifecycle.Archive)).toBe(true);
  });

  it('nextLifecycle advances one step', () => {
    expect(nextLifecycle(ContextLifecycle.Ephemeral)).toBe(ContextLifecycle.Session);
    expect(nextLifecycle(ContextLifecycle.Session)).toBe(ContextLifecycle.Durable);
    expect(nextLifecycle(ContextLifecycle.Durable)).toBe(ContextLifecycle.Archive);
  });

  it('previousLifecycle goes back one step', () => {
    expect(previousLifecycle(ContextLifecycle.Archive)).toBe(ContextLifecycle.Durable);
    expect(previousLifecycle(ContextLifecycle.Durable)).toBe(ContextLifecycle.Session);
    expect(previousLifecycle(ContextLifecycle.Session)).toBe(ContextLifecycle.Ephemeral);
  });
});
```

```typescript
// packages/domain/test/context/context-scope.test.ts
import { describe, it, expect } from 'vitest';
import { createContextScope, mergeScopes, type ContextScope } from '../../src/context/context-scope.js';

describe('ContextScope', () => {
  it('creates empty scope', () => {
    const scope = createContextScope();
    expect(scope.workflow).toBeUndefined();
    expect(scope.role).toBeUndefined();
    expect(scope.phase).toBeUndefined();
  });

  it('creates scope with values', () => {
    const scope = createContextScope({ workflow: 'build', role: 'architect' });
    expect(scope.workflow).toBe('build');
    expect(scope.role).toBe('architect');
    expect(scope.phase).toBeUndefined();
  });

  it('mergeScopes overlays values', () => {
    const base = createContextScope({ workflow: 'plan', role: 'lead' });
    const overlay = createContextScope({ phase: 'review' });
    const merged = mergeScopes(base, overlay);

    expect(merged.workflow).toBe('plan');
    expect(merged.role).toBe('lead');
    expect(merged.phase).toBe('review');
  });

  it('mergeScopes overwrites with explicit values', () => {
    const base = createContextScope({ workflow: 'plan' });
    const overlay = createContextScope({ workflow: 'build' });
    const merged = mergeScopes(base, overlay);

    expect(merged.workflow).toBe('build');
  });

  it('mergeScopes does not overwrite with undefined', () => {
    const base = createContextScope({ workflow: 'plan' });
    const overlay = createContextScope({ workflow: undefined });
    const merged = mergeScopes(base, overlay);

    expect(merged.workflow).toBe('plan');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement ContextType enum**

```typescript
// packages/domain/src/context/context-type.ts
/**
 * What kind of information is this context?
 */
export const ContextType = {
  Project: 'project',
  Engagement: 'engagement',
  Deliberation: 'deliberation',
  Execution: 'execution',
  Memory: 'memory',
} as const;

export type ContextType = (typeof ContextType)[keyof typeof ContextType];
```

- [ ] **Step 4: Implement ContextShape enum**

```typescript
// packages/domain/src/context/context-shape.ts
/**
 * In what form is the context delivered?
 */
export const ContextShape = {
  Full: 'full',
  Summary: 'summary',
  Extract: 'extract',
  Reference: 'reference',
} as const;

export type ContextShape = (typeof ContextShape)[keyof typeof ContextShape];
```

- [ ] **Step 5: Implement ContextScope**

```typescript
// packages/domain/src/context/context-scope.ts
/**
 * Who may see this context? Which workflow, role, or phase?
 * All fields optional — empty scope means "visible to all".
 */

export interface ContextScope {
  readonly workflow?: string;
  readonly role?: string;
  readonly phase?: string;
}

export function createContextScope(init?: Partial<ContextScope>): ContextScope {
  return Object.freeze({
    workflow: init?.workflow,
    role: init?.role,
    phase: init?.phase,
  });
}

/**
 * Merge two scopes. Overlay values take precedence when defined.
 * Undefined overlay values do NOT overwrite base values.
 */
export function mergeScopes(base: ContextScope, overlay: Partial<ContextScope>): ContextScope {
  return createContextScope({
    workflow: overlay.workflow !== undefined ? overlay.workflow : base.workflow,
    role: overlay.role !== undefined ? overlay.role : base.role,
    phase: overlay.phase !== undefined ? overlay.phase : base.phase,
  });
}
```

- [ ] **Step 6: Implement ContextLifecycle**

```typescript
// packages/domain/src/context/context-lifecycle.ts
/**
 * How long does this context live?
 *
 * Lifecycle: ephemeral → session → durable → archive
 * Promote goes forward, demote goes backward.
 * Nothing is durable by default.
 */

export const ContextLifecycle = {
  Ephemeral: 'ephemeral',
  Session: 'session',
  Durable: 'durable',
  Archive: 'archive',
} as const;

export type ContextLifecycle = (typeof ContextLifecycle)[keyof typeof ContextLifecycle];

const ORDER: readonly ContextLifecycle[] = [
  ContextLifecycle.Ephemeral,
  ContextLifecycle.Session,
  ContextLifecycle.Durable,
  ContextLifecycle.Archive,
];

export function canPromote(lifecycle: ContextLifecycle): boolean {
  return ORDER.indexOf(lifecycle) < ORDER.length - 1;
}

export function canDemote(lifecycle: ContextLifecycle): boolean {
  return ORDER.indexOf(lifecycle) > 0;
}

export function nextLifecycle(lifecycle: ContextLifecycle): ContextLifecycle {
  const idx = ORDER.indexOf(lifecycle);
  if (idx >= ORDER.length - 1) {
    throw new Error(`Cannot promote beyond ${lifecycle}`);
  }
  return ORDER[idx + 1];
}

export function previousLifecycle(lifecycle: ContextLifecycle): ContextLifecycle {
  const idx = ORDER.indexOf(lifecycle);
  if (idx <= 0) {
    throw new Error(`Cannot demote below ${lifecycle}`);
  }
  return ORDER[idx - 1];
}
```

- [ ] **Step 7: Implement ContextProfile**

```typescript
// packages/domain/src/context/context-profile.ts
/**
 * A ContextProfile defines scoped context with 4 dimensions:
 * - Type: what kind of information?
 * - Scope: who may see it?
 * - Shape: in what form?
 * - Lifecycle: how long to keep?
 *
 * Immutable value object. All mutations return new instances.
 */

import { ContextType } from './context-type.js';
import { ContextShape } from './context-shape.js';
import type { ContextScope } from './context-scope.js';
import { createContextScope, mergeScopes } from './context-scope.js';
import {
  ContextLifecycle,
  canPromote,
  canDemote,
  nextLifecycle,
  previousLifecycle,
} from './context-lifecycle.js';

export interface ContextProfileInit {
  readonly type: ContextType;
  readonly scope?: Partial<ContextScope>;
  readonly shape: ContextShape;
  readonly lifecycle: ContextLifecycle;
}

export interface ContextProfile {
  readonly type: ContextType;
  readonly scope: ContextScope;
  readonly shape: ContextShape;
  readonly lifecycle: ContextLifecycle;

  /** Return new profile with merged scope. */
  withScope(overlay: Partial<ContextScope>): ContextProfile;

  /** Advance lifecycle one step: ephemeral → session → durable. */
  promote(): ContextProfile;

  /** Step lifecycle backward: archive → durable → session. */
  demote(): ContextProfile;

  /** True if lifecycle is durable. */
  isDurable(): boolean;
}

export function createContextProfile(init: ContextProfileInit): ContextProfile {
  const type = init.type;
  const scope = createContextScope(init.scope);
  const shape = init.shape;
  const lifecycle = init.lifecycle;

  return Object.freeze({
    type,
    scope,
    shape,
    lifecycle,

    withScope(overlay: Partial<ContextScope>): ContextProfile {
      return createContextProfile({
        type,
        scope: mergeScopes(scope, overlay),
        shape,
        lifecycle,
      });
    },

    promote(): ContextProfile {
      if (!canPromote(lifecycle)) {
        throw new Error(`Cannot promote ${lifecycle}`);
      }
      return createContextProfile({
        type,
        scope,
        shape,
        lifecycle: nextLifecycle(lifecycle),
      });
    },

    demote(): ContextProfile {
      if (!canDemote(lifecycle)) {
        throw new Error(`Cannot demote ${lifecycle}`);
      }
      return createContextProfile({
        type,
        scope,
        shape,
        lifecycle: previousLifecycle(lifecycle),
      });
    },

    isDurable(): boolean {
      return lifecycle === ContextLifecycle.Durable;
    },
  });
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: ALL PASS

- [ ] **Step 9: Export from barrel**

Update `packages/domain/src/index.ts`:
```typescript
export { brand, type Branded } from './shared/branded-types.js';

// Context
export { ContextType } from './context/context-type.js';
export { ContextShape } from './context/context-shape.js';
export { createContextScope, mergeScopes, type ContextScope } from './context/context-scope.js';
export {
  ContextLifecycle,
  canPromote,
  canDemote,
  nextLifecycle,
  previousLifecycle,
} from './context/context-lifecycle.js';
export { createContextProfile, type ContextProfile, type ContextProfileInit } from './context/context-profile.js';
```

- [ ] **Step 10: Commit**

```bash
git add packages/domain/src/context/ packages/domain/test/context/ packages/domain/src/index.ts
git commit -m "feat(domain): add ContextProfile value object with 4 dimensions"
```

---

## Task 4: Domain — MemoryArtifact and promote criteria

**Files:**
- Create: `packages/domain/src/memory/memory-artifact.ts`
- Create: `packages/domain/src/memory/artifact-lifecycle.ts`
- Create: `packages/domain/src/memory/promote-criteria.ts`
- Create: `packages/domain/test/memory/artifact-lifecycle.test.ts`
- Create: `packages/domain/test/memory/promote-criteria.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/domain/test/memory/artifact-lifecycle.test.ts
import { describe, it, expect } from 'vitest';
import {
  ArtifactLifecycleState,
  isValidTransition,
  transitionArtifact,
} from '../../src/memory/artifact-lifecycle.js';

describe('ArtifactLifecycle', () => {
  it('valid transitions: ephemeral→session→durable→archive', () => {
    expect(isValidTransition(ArtifactLifecycleState.Ephemeral, ArtifactLifecycleState.Session)).toBe(true);
    expect(isValidTransition(ArtifactLifecycleState.Session, ArtifactLifecycleState.Durable)).toBe(true);
    expect(isValidTransition(ArtifactLifecycleState.Durable, ArtifactLifecycleState.Archive)).toBe(true);
  });

  it('invalid: ephemeral → durable (skip)', () => {
    expect(isValidTransition(ArtifactLifecycleState.Ephemeral, ArtifactLifecycleState.Durable)).toBe(false);
  });

  it('invalid: archive → ephemeral', () => {
    expect(isValidTransition(ArtifactLifecycleState.Archive, ArtifactLifecycleState.Ephemeral)).toBe(false);
  });

  it('transitionArtifact returns new state or throws', () => {
    const result = transitionArtifact(ArtifactLifecycleState.Ephemeral, ArtifactLifecycleState.Session);
    expect(result).toBe(ArtifactLifecycleState.Session);
  });

  it('transitionArtifact throws on invalid', () => {
    expect(() =>
      transitionArtifact(ArtifactLifecycleState.Ephemeral, ArtifactLifecycleState.Durable)
    ).toThrow();
  });
});
```

```typescript
// packages/domain/test/memory/promote-criteria.test.ts
import { describe, it, expect } from 'vitest';
import { evaluatePromoteCriteria, type PromoteCandidate } from '../../src/memory/promote-criteria.js';

describe('PromoteCriteria', () => {
  it('rejects promotion with 0 criteria met', () => {
    const candidate: PromoteCandidate = {
      usedInMultipleSessions: false,
      explainsDecision: false,
      preventsRecurringError: false,
      definesTeamStandard: false,
    };
    expect(evaluatePromoteCriteria(candidate).canPromote).toBe(false);
    expect(evaluatePromoteCriteria(candidate).metCount).toBe(0);
  });

  it('rejects promotion with 1 criterion met', () => {
    const candidate: PromoteCandidate = {
      usedInMultipleSessions: true,
      explainsDecision: false,
      preventsRecurringError: false,
      definesTeamStandard: false,
    };
    expect(evaluatePromoteCriteria(candidate).canPromote).toBe(false);
    expect(evaluatePromoteCriteria(candidate).metCount).toBe(1);
  });

  it('allows promotion with 2+ criteria met', () => {
    const candidate: PromoteCandidate = {
      usedInMultipleSessions: true,
      explainsDecision: true,
      preventsRecurringError: false,
      definesTeamStandard: false,
    };
    expect(evaluatePromoteCriteria(candidate).canPromote).toBe(true);
    expect(evaluatePromoteCriteria(candidate).metCount).toBe(2);
  });

  it('allows promotion with all criteria met', () => {
    const candidate: PromoteCandidate = {
      usedInMultipleSessions: true,
      explainsDecision: true,
      preventsRecurringError: true,
      definesTeamStandard: true,
    };
    expect(evaluatePromoteCriteria(candidate).canPromote).toBe(true);
    expect(evaluatePromoteCriteria(candidate).metCount).toBe(4);
  });

  it('returns which criteria were met', () => {
    const candidate: PromoteCandidate = {
      usedInMultipleSessions: false,
      explainsDecision: true,
      preventsRecurringError: true,
      definesTeamStandard: false,
    };
    const result = evaluatePromoteCriteria(candidate);
    expect(result.metCriteria).toContain('explainsDecision');
    expect(result.metCriteria).toContain('preventsRecurringError');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: FAIL

- [ ] **Step 3: Implement artifact-lifecycle.ts**

```typescript
// packages/domain/src/memory/artifact-lifecycle.ts
/**
 * Artifact lifecycle state machine.
 *
 * States: ephemeral → session → durable → archive
 * Only adjacent forward transitions are valid.
 * Promotion from ephemeral to durable requires going through session first.
 */

export const ArtifactLifecycleState = {
  Ephemeral: 'ephemeral',
  Session: 'session',
  Durable: 'durable',
  Archive: 'archive',
} as const;

export type ArtifactLifecycleState = (typeof ArtifactLifecycleState)[keyof typeof ArtifactLifecycleState];

const VALID_TRANSITIONS: ReadonlyMap<ArtifactLifecycleState, readonly ArtifactLifecycleState[]> = new Map([
  [ArtifactLifecycleState.Ephemeral, [ArtifactLifecycleState.Session]],
  [ArtifactLifecycleState.Session, [ArtifactLifecycleState.Ephemeral, ArtifactLifecycleState.Durable]],
  [ArtifactLifecycleState.Durable, [ArtifactLifecycleState.Session, ArtifactLifecycleState.Archive]],
  [ArtifactLifecycleState.Archive, [ArtifactLifecycleState.Durable]],
]);

export function isValidTransition(from: ArtifactLifecycleState, to: ArtifactLifecycleState): boolean {
  const allowed = VALID_TRANSITIONS.get(from);
  return allowed !== undefined && allowed.includes(to);
}

export function transitionArtifact(from: ArtifactLifecycleState, to: ArtifactLifecycleState): ArtifactLifecycleState {
  if (!isValidTransition(from, to)) {
    throw new Error(`Invalid artifact lifecycle transition: ${from} → ${to}`);
  }
  return to;
}
```

- [ ] **Step 4: Implement promote-criteria.ts**

```typescript
// packages/domain/src/memory/promote-criteria.ts
/**
 * Pure rule engine for artifact promotion.
 *
 * An artifact may be promoted to durable if at least 2 criteria are met:
 * 1. Used in multiple sessions
 * 2. Explains a relevant decision
 * 3. Prevents a recurring error
 * 4. Defines a team standard
 */

export interface PromoteCandidate {
  readonly usedInMultipleSessions: boolean;
  readonly explainsDecision: boolean;
  readonly preventsRecurringError: boolean;
  readonly definesTeamStandard: boolean;
}

export interface PromoteEvaluation {
  readonly canPromote: boolean;
  readonly metCount: number;
  readonly metCriteria: readonly string[];
}

const MINIMUM_CRITERIA = 2;

export function evaluatePromoteCriteria(candidate: PromoteCandidate): PromoteEvaluation {
  const criteria: readonly { key: string; met: boolean }[] = [
    { key: 'usedInMultipleSessions', met: candidate.usedInMultipleSessions },
    { key: 'explainsDecision', met: candidate.explainsDecision },
    { key: 'preventsRecurringError', met: candidate.preventsRecurringError },
    { key: 'definesTeamStandard', met: candidate.definesTeamStandard },
  ];

  const metCriteria = criteria.filter((c) => c.met).map((c) => c.key);
  const metCount = metCriteria.length;

  return Object.freeze({
    canPromote: metCount >= MINIMUM_CRITERIA,
    metCount,
    metCriteria,
  });
}
```

- [ ] **Step 5: Implement memory-artifact.ts**

```typescript
// packages/domain/src/memory/memory-artifact.ts
/**
 * A durable memory artifact — promoted knowledge.
 *
 * Types: decision, pattern, error, standard, guide, reference, spec.
 * Immutable value object.
 */

import { brand, type Branded } from '../shared/branded-types.js';
import { ArtifactLifecycleState } from './artifact-lifecycle.js';

export type MemoryArtifactId = Branded<string, 'MemoryArtifactId'>;
export const memoryArtifactId = brand<string, 'MemoryArtifactId'>;

export const MemoryArtifactType = {
  Decision: 'decision',
  Pattern: 'pattern',
  Error: 'error',
  Standard: 'standard',
  Guide: 'guide',
  Reference: 'reference',
  Spec: 'spec',
} as const;

export type MemoryArtifactType = (typeof MemoryArtifactType)[keyof typeof MemoryArtifactType];

export interface MemoryArtifactInit {
  readonly id: MemoryArtifactId;
  readonly type: MemoryArtifactType;
  readonly title: string;
  readonly content: string;
  readonly lifecycle: ArtifactLifecycleState;
  readonly createdAt: string;  // ISO 8601
  readonly promotedAt?: string;
  readonly usageCount: number;
}

export interface MemoryArtifact {
  readonly id: MemoryArtifactId;
  readonly type: MemoryArtifactType;
  readonly title: string;
  readonly content: string;
  readonly lifecycle: ArtifactLifecycleState;
  readonly createdAt: string;
  readonly promotedAt?: string;
  readonly usageCount: number;

  withLifecycle(state: ArtifactLifecycleState): MemoryArtifact;
  incrementUsage(): MemoryArtifact;
}

export function createMemoryArtifact(init: MemoryArtifactInit): MemoryArtifact {
  return Object.freeze({
    ...init,

    withLifecycle(state: ArtifactLifecycleState): MemoryArtifact {
      return createMemoryArtifact({ ...init, lifecycle: state });
    },

    incrementUsage(): MemoryArtifact {
      return createMemoryArtifact({ ...init, usageCount: init.usageCount + 1 });
    },
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: ALL PASS

- [ ] **Step 7: Export and commit**

Update barrel, then:
```bash
git add packages/domain/src/memory/ packages/domain/test/memory/ packages/domain/src/index.ts
git commit -m "feat(domain): add MemoryArtifact, lifecycle state machine, promote criteria"
```

---

## Task 5: Domain — Model reference and fallback chain

**Files:**
- Create: `packages/domain/src/model/model-reference.ts`
- Create: `packages/domain/src/model/model-role.ts`
- Create: `packages/domain/src/model/fallback-chain.ts`
- Create: `packages/domain/test/model/model-reference.test.ts`
- Create: `packages/domain/test/model/fallback-chain.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/domain/test/model/model-reference.test.ts
import { describe, it, expect } from 'vitest';
import { parseModelReference, type ModelReference, MODEL_REFERENCE_PATTERN } from '../../src/model/model-reference.js';

describe('ModelReference', () => {
  it('parses valid provider/model format', () => {
    const ref = parseModelReference('anthropic/claude-opus');
    expect(ref).not.toBeNull();
    expect(ref!.provider).toBe('anthropic');
    expect(ref!.model).toBe('claude-opus');
  });

  it('parses models with dots and dashes', () => {
    const ref = parseModelReference('openai/gpt-4o-mini');
    expect(ref!.provider).toBe('openai');
    expect(ref!.model).toBe('gpt-4o-mini');
  });

  it('parses models with dots', () => {
    const ref = parseModelReference('google/gemini-2.5-pro');
    expect(ref!.provider).toBe('google');
    expect(ref!.model).toBe('gemini-2.5-pro');
  });

  it('rejects empty string', () => {
    expect(parseModelReference('')).toBeNull();
  });

  it('rejects missing slash', () => {
    expect(parseModelReference('claude-opus')).toBeNull();
  });

  it('rejects uppercase provider', () => {
    expect(parseModelReference('Anthropic/claude-opus')).toBeNull();
  });

  it('rejects double slash', () => {
    expect(parseModelReference('anthropic//claude')).toBeNull();
  });

  it('toString returns canonical format', () => {
    const ref = parseModelReference('anthropic/claude-opus');
    expect(ref!.toString()).toBe('anthropic/claude-opus');
  });
});
```

```typescript
// packages/domain/test/model/fallback-chain.test.ts
import { describe, it, expect } from 'vitest';
import {
  createFallbackChain,
  resolveModel,
  type FallbackChain,
} from '../../src/model/fallback-chain.js';
import { parseModelReference } from '../../src/model/model-reference.js';

describe('FallbackChain', () => {
  const anthropicOpus = parseModelReference('anthropic/claude-opus')!;
  const anthropicSonnet = parseModelReference('anthropic/claude-sonnet')!;
  const openaiGpt4 = parseModelReference('openai/gpt-4o')!;

  it('resolves to primary when no failures', () => {
    const chain = createFallbackChain([anthropicOpus, anthropicSonnet]);
    const result = resolveModel(chain, new Set());
    expect(result.toString()).toBe('anthropic/claude-opus');
  });

  it('falls back to second when primary is in failed set', () => {
    const chain = createFallbackChain([anthropicOpus, anthropicSonnet]);
    const result = resolveModel(chain, new Set(['anthropic/claude-opus']));
    expect(result.toString()).toBe('anthropic/claude-sonnet');
  });

  it('falls back across providers', () => {
    const chain = createFallbackChain([anthropicOpus, openaiGpt4]);
    const result = resolveModel(chain, new Set(['anthropic/claude-opus']));
    expect(result.toString()).toBe('openai/gpt-4o');
  });

  it('returns primary when all are failed', () => {
    // Last resort: still use primary even if it failed before
    const chain = createFallbackChain([anthropicOpus, anthropicSonnet]);
    const result = resolveModel(chain, new Set(['anthropic/claude-opus', 'anthropic/claude-sonnet']));
    expect(result.toString()).toBe('anthropic/claude-opus');
  });

  it('chain has correct depth', () => {
    const chain = createFallbackChain([anthropicOpus, anthropicSonnet, openaiGpt4]);
    expect(chain.depth).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: FAIL

- [ ] **Step 3: Implement model-reference.ts**

```typescript
// packages/domain/src/model/model-reference.ts
/**
 * Canonical model reference: [provider]/[model]
 *
 * Provider: lowercase alphanumeric and dashes.
 * Model: lowercase alphanumeric, dashes, and dots.
 */

export const MODEL_REFERENCE_PATTERN = /^[a-z0-9-]+\/[a-z0-9.-]+$/;

export interface ModelReference {
  readonly provider: string;
  readonly model: string;
  toString(): string;
}

export function parseModelReference(ref: string): ModelReference | null {
  if (!MODEL_REFERENCE_PATTERN.test(ref)) {
    return null;
  }
  const [provider, model] = ref.split('/') as [string, string];
  if (!provider || !model) {
    return null;
  }
  return Object.freeze({
    provider,
    model,
    toString(): string {
      return `${provider}/${model}`;
    },
  });
}
```

- [ ] **Step 4: Implement model-role.ts**

```typescript
// packages/domain/src/model/model-role.ts
/**
 * A role is a named alias that maps to a fallback chain.
 * e.g., "creative" → anthropic/claude-opus → anthropic/claude-sonnet
 */

import type { FallbackChain } from './fallback-chain.js';

export const WellKnownRole = {
  Creative: 'creative',
  Fast: 'fast',
  Thorough: 'thorough',
  Reviewer: 'reviewer',
  Planner: 'planner',
} as const;

export type WellKnownRole = (typeof WellKnownRole)[keyof typeof WellKnownRole];

export interface ModelRole {
  readonly name: string;
  readonly chain: FallbackChain;
}
```

- [ ] **Step 5: Implement fallback-chain.ts**

```typescript
// packages/domain/src/model/fallback-chain.ts
/**
 * Ordered fallback chain for model resolution.
 * Pure function: given a chain and a set of failed refs,
 * returns the first non-failed model.
 */

import type { ModelReference } from './model-reference.js';

export interface FallbackChain {
  readonly models: readonly ModelReference[];
  readonly depth: number;
}

export function createFallbackChain(models: readonly ModelReference[]): FallbackChain {
  if (models.length === 0) {
    throw new Error('Fallback chain must have at least one model');
  }
  return Object.freeze({
    models,
    depth: models.length,
  });
}

/**
 * Resolve the first model in the chain that is not in the failed set.
 * If all are failed, returns the primary (first) as last resort.
 */
export function resolveModel(chain: FallbackChain, failedRefs: ReadonlySet<string>): ModelReference {
  for (const model of chain.models) {
    if (!failedRefs.has(model.toString())) {
      return model;
    }
  }
  // Last resort: return primary even though it failed
  return chain.models[0];
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: ALL PASS

- [ ] **Step 7: Export and commit**

```bash
git add packages/domain/src/model/ packages/domain/test/model/ packages/domain/src/index.ts
git commit -m "feat(domain): add ModelReference, FallbackChain with pure resolution logic"
```

---

## Task 6: Domain — Workflow DAG validator

**Files:**
- Create: `packages/domain/src/workflow/workflow-node.ts`
- Create: `packages/domain/src/workflow/workflow-definition.ts`
- Create: `packages/domain/src/workflow/dag-validator.ts`
- Create: `packages/domain/test/workflow/dag-validator.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/domain/test/workflow/dag-validator.test.ts
import { describe, it, expect } from 'vitest';
import { validateDag, type DagNode, type DagValidationError } from '../../src/workflow/dag-validator.js';

describe('DAG Validator', () => {
  it('accepts a simple linear chain', () => {
    const nodes: DagNode[] = [
      { id: 'a', dependencies: [] },
      { id: 'b', dependencies: ['a'] },
      { id: 'c', dependencies: ['b'] },
    ];
    const result = validateDag(nodes);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts a diamond shape', () => {
    const nodes: DagNode[] = [
      { id: 'start', dependencies: [] },
      { id: 'left', dependencies: ['start'] },
      { id: 'right', dependencies: ['start'] },
      { id: 'end', dependencies: ['left', 'right'] },
    ];
    const result = validateDag(nodes);
    expect(result.valid).toBe(true);
  });

  it('detects a simple cycle', () => {
    const nodes: DagNode[] = [
      { id: 'a', dependencies: ['b'] },
      { id: 'b', dependencies: ['a'] },
    ];
    const result = validateDag(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].type).toBe('cycle');
  });

  it('detects a 3-node cycle', () => {
    const nodes: DagNode[] = [
      { id: 'a', dependencies: ['c'] },
      { id: 'b', dependencies: ['a'] },
      { id: 'c', dependencies: ['b'] },
    ];
    const result = validateDag(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'cycle')).toBe(true);
  });

  it('detects missing dependency', () => {
    const nodes: DagNode[] = [
      { id: 'a', dependencies: ['nonexistent'] },
    ];
    const result = validateDag(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe('missing_dependency');
    expect(result.errors[0].nodeId).toBe('a');
  });

  it('detects duplicate node ids', () => {
    const nodes: DagNode[] = [
      { id: 'a', dependencies: [] },
      { id: 'a', dependencies: [] },
    ];
    const result = validateDag(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe('duplicate_id');
  });

  it('accepts single node with no dependencies', () => {
    const nodes: DagNode[] = [{ id: 'solo', dependencies: [] }];
    const result = validateDag(nodes);
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: FAIL

- [ ] **Step 3: Implement workflow types and DAG validator**

```typescript
// packages/domain/src/workflow/workflow-node.ts
/**
 * A node in a workflow DAG.
 * Maps to an agent definition.
 */
export interface DagNode {
  readonly id: string;
  readonly dependencies: readonly string[];
}
```

```typescript
// packages/domain/src/workflow/dag-validator.ts
/**
 * Pure DAG validation — cycle detection, missing deps, duplicate IDs.
 * No I/O. No external dependencies.
 */

import type { DagNode } from './workflow-node.js';

export type DagValidationError =
  | { type: 'cycle'; nodeId: string; cycle: readonly string[] }
  | { type: 'missing_dependency'; nodeId: string; missingId: string }
  | { type: 'duplicate_id'; nodeId: string };

export interface DagValidationResult {
  readonly valid: boolean;
  readonly errors: readonly DagValidationError[];
}

export function validateDag(nodes: readonly DagNode[]): DagValidationResult {
  const errors: DagValidationError[] = [];

  // Check duplicate IDs
  const seen = new Map<string, DagNode>();
  for (const node of nodes) {
    if (seen.has(node.id)) {
      errors.push({ type: 'duplicate_id', nodeId: node.id });
    }
    seen.set(node.id, node);
  }

  // Check missing dependencies
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      if (!seen.has(dep)) {
        errors.push({ type: 'missing_dependency', nodeId: node.id, missingId: dep });
      }
    }
  }

  // Check cycles using DFS with coloring
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const node of nodes) {
    color.set(node.id, WHITE);
  }

  const path: string[] = [];

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY);
    path.push(nodeId);

    const node = seen.get(nodeId);
    if (node) {
      for (const dep of node.dependencies) {
        if (!color.has(dep)) continue; // missing dep already reported
        const depColor = color.get(dep);
        if (depColor === GRAY) {
          // Found cycle — extract it from path
          const cycleStart = path.indexOf(dep);
          const cycle = path.slice(cycleStart);
          errors.push({ type: 'cycle', nodeId: dep, cycle });
          return true;
        }
        if (depColor === WHITE) {
          if (dfs(dep)) return true;
        }
      }
    }

    path.pop();
    color.set(nodeId, BLACK);
    return false;
  }

  for (const node of nodes) {
    if (color.get(node.id) === WHITE) {
      dfs(node.id);
    }
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  });
}
```

```typescript
// packages/domain/src/workflow/workflow-definition.ts
/**
 * A workflow definition — Archon-compatible with Firm extensions.
 */
import type { DagNode } from './workflow-node.js';

export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly nodes: readonly DagNode[];
  readonly metadata?: Readonly<Record<string, string>>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: ALL PASS

- [ ] **Step 5: Export and commit**

```bash
git add packages/domain/src/workflow/ packages/domain/test/workflow/ packages/domain/src/index.ts
git commit -m "feat(domain): add DAG validator with cycle detection and workflow types"
```

---

## Task 7: Domain — MVI rules and DirectoryMap

**Files:**
- Create: `packages/domain/src/mvi/mvi-rules.ts`
- Create: `packages/domain/src/mvi/file-info.ts`
- Create: `packages/domain/src/directory-map/directory-map.ts`
- Create: `packages/domain/test/mvi/mvi-rules.test.ts`
- Create: `packages/domain/test/directory-map/directory-map.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/domain/test/mvi/mvi-rules.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateMvi,
  type MviCheckInput,
  type MviViolation,
  MVI_MAX_LINES,
  MVI_MAX_SECTIONS,
  MVI_MAX_NESTING_DEPTH,
  MVI_MAX_LINE_LENGTH,
} from '../../src/mvi/mvi-rules.js';

describe('MVI Rules', () => {
  it('passes for compliant file', () => {
    const input: MviCheckInput = {
      path: 'context/guide.md',
      lineCount: 50,
      sectionCount: 5,
      maxNestingDepth: 2,
      maxLineLength: 80,
      mviWaived: false,
    };
    const result = validateMvi(input);
    expect(result.compliant).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('detects line count violation', () => {
    const input: MviCheckInput = {
      path: 'context/long.md',
      lineCount: 250,
      sectionCount: 3,
      maxNestingDepth: 1,
      maxLineLength: 80,
      mviWaived: false,
    };
    const result = validateMvi(input);
    expect(result.compliant).toBe(false);
    expect(result.violations.some((v) => v.rule === 'max_lines')).toBe(true);
  });

  it('detects section count violation', () => {
    const input: MviCheckInput = {
      path: 'context/many-sections.md',
      lineCount: 50,
      sectionCount: 10,
      maxNestingDepth: 1,
      maxLineLength: 80,
      mviWaived: false,
    };
    const result = validateMvi(input);
    expect(result.compliant).toBe(false);
    expect(result.violations.some((v) => v.rule === 'max_sections')).toBe(true);
  });

  it('detects nesting depth violation', () => {
    const input: MviCheckInput = {
      path: 'context/deep.md',
      lineCount: 50,
      sectionCount: 3,
      maxNestingDepth: 5,
      maxLineLength: 80,
      mviWaived: false,
    };
    const result = validateMvi(input);
    expect(result.compliant).toBe(false);
    expect(result.violations.some((v) => v.rule === 'max_nesting')).toBe(true);
  });

  it('detects line length violation', () => {
    const input: MviCheckInput = {
      path: 'context/wide.md',
      lineCount: 50,
      sectionCount: 3,
      maxNestingDepth: 1,
      maxLineLength: 150,
      mviWaived: false,
    };
    const result = validateMvi(input);
    expect(result.compliant).toBe(false);
    expect(result.violations.some((v) => v.rule === 'max_line_length')).toBe(true);
  });

  it('waives all violations when mviWaived is true', () => {
    const input: MviCheckInput = {
      path: 'context/generated.md',
      lineCount: 500,
      sectionCount: 15,
      maxNestingDepth: 6,
      maxLineLength: 200,
      mviWaived: true,
    };
    const result = validateMvi(input);
    expect(result.compliant).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.waived).toBe(true);
  });
});
```

```typescript
// packages/domain/test/directory-map/directory-map.test.ts
import { describe, it, expect } from 'vitest';
import { createDirectoryMap, addEntry, type DirectoryMapEntry } from '../../src/directory-map/directory-map.js';

describe('DirectoryMap', () => {
  it('creates empty map', () => {
    const map = createDirectoryMap('context/');
    expect(map.directory).toBe('context/');
    expect(map.entries).toHaveLength(0);
    expect(map.totalFiles).toBe(0);
  });

  it('adds entries up to max 20', () => {
    let map = createDirectoryMap('context/');
    for (let i = 0; i < 25; i++) {
      map = addEntry(map, { name: `file-${i}.md`, type: 'file', lineCount: 50 });
    }
    expect(map.entries).toHaveLength(20);
    expect(map.totalFiles).toBe(20); // capped
  });

  it('refuses entry when at capacity', () => {
    let map = createDirectoryMap('context/');
    for (let i = 0; i < 20; i++) {
      map = addEntry(map, { name: `file-${i}.md`, type: 'file', lineCount: 50 });
    }
    // 21st entry should be ignored
    map = addEntry(map, { name: 'overflow.md', type: 'file', lineCount: 50 });
    expect(map.entries).toHaveLength(20);
    expect(map.entries.every((e) => e.name !== 'overflow.md')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: FAIL

- [ ] **Step 3: Implement mvi-rules.ts**

```typescript
// packages/domain/src/mvi/mvi-rules.ts
/**
 * Minimum Viable Information (MVI) validation rules.
 * Pure functions — no I/O.
 */

export const MVI_MAX_LINES = 200;
export const MVI_MAX_SECTIONS = 7;
export const MVI_MAX_NESTING_DEPTH = 3;
export const MVI_MAX_LINE_LENGTH = 100;

export interface MviCheckInput {
  readonly path: string;
  readonly lineCount: number;
  readonly sectionCount: number;
  readonly maxNestingDepth: number;
  readonly maxLineLength: number;
  readonly mviWaived: boolean;
}

export interface MviViolation {
  readonly rule: string;
  readonly actual: number;
  readonly limit: number;
  readonly message: string;
}

export interface MviResult {
  readonly compliant: boolean;
  readonly violations: readonly MviViolation[];
  readonly waived: boolean;
}

export function validateMvi(input: MviCheckInput): MviResult {
  if (input.mviWaived) {
    return Object.freeze({ compliant: true, violations: [], waived: true });
  }

  const violations: MviViolation[] = [];

  if (input.lineCount > MVI_MAX_LINES) {
    violations.push({
      rule: 'max_lines',
      actual: input.lineCount,
      limit: MVI_MAX_LINES,
      message: `${input.path}: ${input.lineCount} lines exceeds ${MVI_MAX_LINES}`,
    });
  }

  if (input.sectionCount > MVI_MAX_SECTIONS) {
    violations.push({
      rule: 'max_sections',
      actual: input.sectionCount,
      limit: MVI_MAX_SECTIONS,
      message: `${input.path}: ${input.sectionCount} sections exceeds ${MVI_MAX_SECTIONS}`,
    });
  }

  if (input.maxNestingDepth > MVI_MAX_NESTING_DEPTH) {
    violations.push({
      rule: 'max_nesting',
      actual: input.maxNestingDepth,
      limit: MVI_MAX_NESTING_DEPTH,
      message: `${input.path}: nesting depth ${input.maxNestingDepth} exceeds ${MVI_MAX_NESTING_DEPTH}`,
    });
  }

  if (input.maxLineLength > MVI_MAX_LINE_LENGTH) {
    violations.push({
      rule: 'max_line_length',
      actual: input.maxLineLength,
      limit: MVI_MAX_LINE_LENGTH,
      message: `${input.path}: line length ${input.maxLineLength} exceeds ${MVI_MAX_LINE_LENGTH}`,
    });
  }

  return Object.freeze({
    compliant: violations.length === 0,
    violations: Object.freeze(violations),
    waived: false,
  });
}
```

- [ ] **Step 4: Implement file-info.ts**

```typescript
// packages/domain/src/mvi/file-info.ts
/**
 * Value object describing a file's measurable properties for MVI checks.
 */
export interface FileInfo {
  readonly path: string;
  readonly lineCount: number;
  readonly sectionCount: number;
  readonly maxNestingDepth: number;
  readonly maxLineLength: number;
  readonly mviWaived: boolean;
}
```

- [ ] **Step 5: Implement directory-map.ts**

```typescript
// packages/domain/src/directory-map/directory-map.ts
/**
 * A DirectoryMap is a navigation index for a .firm/ subdirectory.
 * Max 20 entries per directory (PRD requirement).
 * Immutable value object.
 */

export const MAX_ENTRIES_PER_DIRECTORY = 20;

export interface DirectoryMapEntry {
  readonly name: string;
  readonly type: 'file' | 'directory';
  readonly lineCount?: number;
}

export interface DirectoryMap {
  readonly directory: string;
  readonly entries: readonly DirectoryMapEntry[];
  readonly totalFiles: number;
}

export function createDirectoryMap(directory: string): DirectoryMap {
  return Object.freeze({
    directory,
    entries: [],
    totalFiles: 0,
  });
}

export function addEntry(map: DirectoryMap, entry: DirectoryMapEntry): DirectoryMap {
  if (map.entries.length >= MAX_ENTRIES_PER_DIRECTORY) {
    return map; // refuse entry at capacity
  }
  return Object.freeze({
    directory: map.directory,
    entries: Object.freeze([...map.entries, entry]),
    totalFiles: map.entries.length + 1,
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: ALL PASS

- [ ] **Step 7: Export and commit**

```bash
git add packages/domain/src/mvi/ packages/domain/src/directory-map/ packages/domain/test/mvi/ packages/domain/test/directory-map/ packages/domain/src/index.ts
git commit -m "feat(domain): add MVI validation rules and DirectoryMap value objects"
```

---

## Task 8: Domain — AgentStructure and Template

**Files:**
- Create: `packages/domain/src/agent/agent-mode.ts`
- Create: `packages/domain/src/agent/agent-structure.ts`
- Create: `packages/domain/src/template/protocol-type.ts`
- Create: `packages/domain/src/template/template.ts`
- Create: `packages/domain/src/engagement/engagement-type.ts`
- Create: `packages/domain/test/agent/agent-structure.test.ts`
- Create: `packages/domain/test/template/template.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/domain/test/agent/agent-structure.test.ts
import { describe, it, expect } from 'vitest';
import {
  createAgentStructure,
  validateAgentStructure,
  AGENT_REQUIRED_SECTIONS,
  type AgentStructure,
} from '../../src/agent/agent-structure.js';
import { AgentMode } from '../../src/agent/agent-mode.js';

describe('AgentStructure', () => {
  it('creates a structure with all 8 sections', () => {
    const agent = createAgentStructure({
      identity: 'Code reviewer',
      contextNeeds: ['source code', 'style guide'],
      permissions: ['read files', 'write reviews'],
      modelPreference: 'thorough',
      workflow: 'review-workflow',
      delegationRules: ['delegate architecture questions to architect agent'],
      errorHandling: 'log and report to user',
      outputContract: 'Review findings template',
      mode: AgentMode.Subagent,
    });

    expect(agent.identity).toBe('Code reviewer');
    expect(agent.mode).toBe(AgentMode.Subagent);
  });

  it('validates a complete structure', () => {
    const agent = createAgentStructure({
      identity: 'Test agent',
      contextNeeds: [],
      permissions: [],
      modelPreference: 'fast',
      workflow: '',
      delegationRules: [],
      errorHandling: 'throw',
      outputContract: 'text',
      mode: AgentMode.Leaf,
    });

    const result = validateAgentStructure(agent);
    expect(result.valid).toBe(true);
    expect(result.missingSections).toHaveLength(0);
  });

  it('detects missing required sections', () => {
    const agent = createAgentStructure({
      identity: '',
      contextNeeds: [],
      permissions: [],
      modelPreference: '',
      workflow: '',
      delegationRules: [],
      errorHandling: '',
      outputContract: '',
      mode: AgentMode.Primary,
    });

    const result = validateAgentStructure(agent);
    expect(result.valid).toBe(false);
    expect(result.missingSections.length).toBeGreaterThan(0);
  });

  it('AGENT_REQUIRED_SECTIONS has exactly 8 entries', () => {
    expect(AGENT_REQUIRED_SECTIONS).toHaveLength(8);
  });
});
```

```typescript
// packages/domain/test/template/template.test.ts
import { describe, it, expect } from 'vitest';
import { createTemplate, validateTemplate, type Template } from '../../src/template/template.js';
import { ProtocolType } from '../../src/template/protocol-type.js';

describe('Template', () => {
  it('creates a template with frontmatter', () => {
    const template = createTemplate({
      id: 'intake-brief',
      version: '1.0.0',
      protocol: ProtocolType.Intake,
      requiredSections: ['summary', 'context', 'criteria', 'constraints', 'stakeholders', 'priority', 'risks'],
      content: '# Intake Brief\n...',
    });

    expect(template.id).toBe('intake-brief');
    expect(template.protocol).toBe(ProtocolType.Intake);
  });

  it('validates template with all required sections present', () => {
    const template = createTemplate({
      id: 'test',
      version: '1.0.0',
      protocol: ProtocolType.Handoff,
      requiredSections: ['completed', 'state', 'decisions'],
      content: '# Test\n## Completed\n## State\n## Decisions\n',
    });

    const result = validateTemplate(template);
    expect(result.valid).toBe(true);
  });

  it('detects missing sections in content', () => {
    const template = createTemplate({
      id: 'test',
      version: '1.0.0',
      protocol: ProtocolType.Handoff,
      requiredSections: ['completed', 'state', 'decisions', 'missing-section'],
      content: '# Test\n## Completed\n## State\n',
    });

    const result = validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.missingSections).toContain('decisions');
    expect(result.missingSections).toContain('missing-section');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement agent-mode.ts**

```typescript
// packages/domain/src/agent/agent-mode.ts
/**
 * Agent execution mode.
 * - primary: top-level agent, may delegate
 * - subagent: specialist, may delegate
 * - leaf: executor, may NOT delegate
 */
export const AgentMode = {
  Primary: 'primary',
  Subagent: 'subagent',
  Leaf: 'leaf',
} as const;

export type AgentMode = (typeof AgentMode)[keyof typeof AgentMode];
```

- [ ] **Step 4: Implement agent-structure.ts**

```typescript
// packages/domain/src/agent/agent-structure.ts
/**
 * Agent structure template with 8 required sections.
 * Every agent in The Firm gets this structure as default.
 * All sections are user-overridable.
 */

import type { AgentMode } from './agent-mode.js';

export const AGENT_REQUIRED_SECTIONS = [
  'identity',
  'contextNeeds',
  'permissions',
  'modelPreference',
  'workflow',
  'delegationRules',
  'errorHandling',
  'outputContract',
] as const;

export type AgentRequiredSection = (typeof AGENT_REQUIRED_SECTIONS)[number];

export interface AgentStructureInit {
  readonly identity: string;
  readonly contextNeeds: readonly string[];
  readonly permissions: readonly string[];
  readonly modelPreference: string;
  readonly workflow: string;
  readonly delegationRules: readonly string[];
  readonly errorHandling: string;
  readonly outputContract: string;
  readonly mode: AgentMode;
}

export interface AgentStructure {
  readonly identity: string;
  readonly contextNeeds: readonly string[];
  readonly permissions: readonly string[];
  readonly modelPreference: string;
  readonly workflow: string;
  readonly delegationRules: readonly string[];
  readonly errorHandling: string;
  readonly outputContract: string;
  readonly mode: AgentMode;
}

export function createAgentStructure(init: AgentStructureInit): AgentStructure {
  return Object.freeze({ ...init });
}

export interface AgentStructureValidation {
  readonly valid: boolean;
  readonly missingSections: readonly string[];
}

export function validateAgentStructure(agent: AgentStructure): AgentStructureValidation {
  const missing: string[] = [];
  for (const section of AGENT_REQUIRED_SECTIONS) {
    const value = agent[section];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push(section);
    }
    if (Array.isArray(value) && value.length === 0) {
      // Arrays can be empty — that's valid (e.g., no delegation rules for leaf)
    }
  }
  return Object.freeze({
    valid: missing.length === 0,
    missingSections: Object.freeze(missing),
  });
}
```

- [ ] **Step 5: Implement protocol-type.ts and template.ts**

```typescript
// packages/domain/src/template/protocol-type.ts
export const ProtocolType = {
  Intake: 'intake',
  Plan: 'plan',
  Handoff: 'handoff',
  Review: 'review',
  Decision: 'decision',
  Capture: 'capture',
} as const;

export type ProtocolType = (typeof ProtocolType)[keyof typeof ProtocolType];
```

```typescript
// packages/domain/src/template/template.ts
import type { ProtocolType } from './protocol-type.js';

export interface TemplateInit {
  readonly id: string;
  readonly version: string;
  readonly protocol: ProtocolType;
  readonly requiredSections: readonly string[];
  readonly content: string;
}

export interface Template {
  readonly id: string;
  readonly version: string;
  readonly protocol: ProtocolType;
  readonly requiredSections: readonly string[];
  readonly content: string;
}

export function createTemplate(init: TemplateInit): Template {
  return Object.freeze({ ...init });
}

export interface TemplateValidation {
  readonly valid: boolean;
  readonly missingSections: readonly string[];
}

/**
 * Validate that the content contains all required section headings.
 * Section headings are detected as "## SectionName" (markdown h2).
 */
export function validateTemplate(template: Template): TemplateValidation {
  const presentSections = new Set<string>();
  const headingPattern = /^## (.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(template.content)) !== null) {
    presentSections.add(match[1].trim().toLowerCase().replace(/\s+/g, '-'));
  }

  const missing = template.requiredSections.filter(
    (section) => !presentSections.has(section.toLowerCase().replace(/\s+/g, '-'))
  );

  return Object.freeze({
    valid: missing.length === 0,
    missingSections: Object.freeze(missing),
  });
}
```

- [ ] **Step 6: Implement engagement-type.ts**

```typescript
// packages/domain/src/engagement/engagement-type.ts
export const EngagementType = {
  Feature: 'feature',
  Bug: 'bug',
  Research: 'research',
  Architecture: 'architecture',
  Content: 'content',
  Refactor: 'refactor',
  Docs: 'docs',
} as const;

export type EngagementType = (typeof EngagementType)[keyof typeof EngagementType];
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd /home/digi4care/projects/the-firm/packages/domain && npm test`
Expected: ALL PASS

- [ ] **Step 8: Export and commit**

Update barrel with all remaining exports, then:
```bash
git add packages/domain/src/agent/ packages/domain/src/template/ packages/domain/src/engagement/ packages/domain/test/agent/ packages/domain/test/template/ packages/domain/src/index.ts
git commit -m "feat(domain): add AgentStructure, Template, ProtocolType, EngagementType"
```

---

## Task 9: Create the `ports` package

**Files:**
- Create: `packages/ports/package.json`
- Create: `packages/ports/tsconfig.build.json`
- Create: `packages/ports/src/index.ts`
- Create: `packages/ports/src/outbound/filesystem.ts`
- Create: `packages/ports/src/outbound/session-store.ts`
- Create: `packages/ports/src/outbound/event-bus.ts`
- Create: `packages/ports/src/outbound/ai-provider.ts`
- Create: `packages/ports/src/inbound/context-manager.ts`
- Create: `packages/ports/src/inbound/workflow-runner.ts`
- Create: `packages/ports/src/inbound/directory-mapper.ts`
- Create: `packages/ports/src/inbound/mvi-validator.ts`
- Create: `packages/ports/test/ports-contract.test.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@digi4care/the-firm-ports",
  "version": "0.0.1",
  "description": "Ports (interfaces) for The Firm hexagonal architecture — inbound use cases and outbound infrastructure contracts",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md"],
  "scripts": {
    "clean": "shx rm -rf dist",
    "build": "tsgo -p tsconfig.build.json",
    "dev": "tsgo -p tsconfig.build.json --watch --preserveWatchOutput",
    "test": "vitest --run",
    "prepublishOnly": "npm run clean && npm run build"
  },
  "dependencies": {
    "@digi4care/the-firm-domain": "^0.0.1"
  },
  "devDependencies": {
    "shx": "^0.4.0",
    "vitest": "^3.1.1"
  },
  "keywords": ["ports", "interfaces", "hexagonal"],
  "author": "digi4care",
  "license": "MIT"
}
```

- [ ] **Step 2: Create tsconfig.build.json** (same pattern as domain)

- [ ] **Step 3: Create vitest.config.ts** (same as domain)

- [ ] **Step 4: Implement outbound ports**

```typescript
// packages/ports/src/outbound/filesystem.ts
/**
 * FileSystem port — outbound infrastructure contract.
 * The domain defines what file operations it needs.
 * Adapters implement this against Node.js fs, memory, etc.
 */
import type { FileInfo } from '@digi4care/the-firm-domain/mvi/file-info';

export interface FileSystemPort {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  list(dir: string): Promise<DirEntry[]>;
  exists(path: string): Promise<boolean>;
  readFileStats(path: string): Promise<FileInfo>;
}

export interface DirEntry {
  readonly name: string;
  readonly type: 'file' | 'directory';
  readonly path: string;
}
```

```typescript
// packages/ports/src/outbound/ai-provider.ts
/**
 * AI Provider port — the domain's contract for streaming AI responses.
 * Adapters wrap Anthropic, OpenAI, Google, etc.
 */
export interface AIProviderPort {
  readonly providerId: string;
  readonly displayName: string;

  stream(request: AIStreamRequest): AsyncIterable<AIStreamEvent>;
  listModels(): Promise<AIModelInfo[]>;
  validateConnection(): Promise<boolean>;
}

export interface AIStreamRequest {
  readonly model: string;
  readonly messages: readonly AIMessage[];
  readonly systemPrompt?: string;
  readonly maxTokens?: number;
  readonly signal?: AbortSignal;
}

export interface AIMessage {
  readonly role: 'user' | 'assistant' | 'toolResult';
  readonly content: string;
}

export type AIStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; id: string; name: string; args: unknown }
  | { type: 'done'; stopReason: string }
  | { type: 'error'; error: string };

export interface AIModelInfo {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly contextWindow: number;
  readonly maxTokens: number;
}
```

```typescript
// packages/ports/src/outbound/event-bus.ts
/**
 * Event bus port — decoupled event publishing/subscription.
 */
export interface EventBusPort {
  emit(event: DomainEvent): void;
  on(type: string, handler: (event: DomainEvent) => void): Subscription;
  off(type: string, handler: (event: DomainEvent) => void): void;
}

export interface DomainEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly payload: unknown;
}

export interface Subscription {
  unsubscribe(): void;
}
```

```typescript
// packages/ports/src/outbound/session-store.ts
/**
 * Session store port — session persistence contract.
 */
export interface SessionStorePort {
  save(session: SessionData): Promise<void>;
  load(id: string): Promise<SessionData | null>;
  list(): Promise<SessionSummary[]>;
  delete(id: string): Promise<void>;
}

export interface SessionData {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly messages: unknown[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SessionSummary {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly messageCount: number;
}
```

- [ ] **Step 5: Implement inbound ports (use case interfaces)**

```typescript
// packages/ports/src/inbound/directory-mapper.ts
/**
 * Inbound port — the "firm map" use case.
 * Maps the .firm/ directory structure.
 */
import type { DirectoryMap } from '@digi4care/the-firm-domain/directory-map/directory-map';

export interface DirectoryMapperPort {
  /**
   * Map a .firm/ subdirectory (or the entire .firm/).
   * Returns a DirectoryMap with entries capped at 20 per directory.
   */
  map(scope?: string): Promise<DirectoryMap>;
}
```

```typescript
// packages/ports/src/inbound/mvi-validator.ts
/**
 * Inbound port — the "firm validate" use case.
 * Checks MVI compliance, navigation accuracy, file integrity.
 */
import type { MviResult } from '@digi4care/the-firm-domain/mvi/mvi-rules';

export interface MviValidatorPort {
  validate(scope?: string): Promise<ValidationReport>;
}

export interface ValidationReport {
  readonly valid: boolean;
  readonly fileResults: readonly FileValidation[];
  readonly navigationErrors: readonly NavigationError[];
}

export interface FileValidation {
  readonly path: string;
  readonly mviResult: MviResult;
}

export interface NavigationError {
  readonly navigationFile: string;
  readonly type: 'missing_file' | 'broken_reference' | 'orphaned_file';
  readonly detail: string;
}
```

```typescript
// packages/ports/src/inbound/context-manager.ts
/**
 * Inbound port — context operations use case.
 * Extract, harvest, capture, compact, organize.
 */
import type { ContextProfile } from '@digi4care/the-firm-domain/context/context-profile';
import type { MemoryArtifact } from '@digi4care/the-firm-domain/memory/memory-artifact';

export interface ContextManagerPort {
  extract(source: Source): Promise<ContextFile>;
  harvest(path: string): Promise<ContextFile[]>;
  capture(type: CaptureType, content: string): Promise<MemoryArtifact>;
  compact(file: ContextFile): Promise<ContextFile>;
  validate(scope?: string): Promise<ValidationResult>;
}

export type Source =
  | { type: 'local'; path: string }
  | { type: 'url'; url: string }
  | { type: 'github'; repo: string; focus?: string }
  | { type: 'gitlab'; repo: string; focus?: string };

export type CaptureType = 'error' | 'pattern' | 'decision';

export interface ContextFile {
  readonly path: string;
  readonly content: string;
  readonly profile: ContextProfile;
  readonly lineCount: number;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
```

```typescript
// packages/ports/src/inbound/workflow-runner.ts
/**
 * Inbound port — workflow execution use case.
 */
import type { WorkflowDefinition } from '@digi4care/the-firm-domain/workflow/workflow-definition';
import type { DagValidationResult } from '@digi4care/the-firm-domain/workflow/dag-validator';

export interface WorkflowRunnerPort {
  run(definition: WorkflowDefinition): Promise<WorkflowResult>;
  resume(id: string): Promise<WorkflowResult>;
  status(id: string): Promise<WorkflowStatus>;
  import(path: string): Promise<WorkflowDefinition>;
  validate(definition: WorkflowDefinition): DagValidationResult;
}

export type WorkflowResult =
  | { type: 'completed'; workflowId: string }
  | { type: 'paused'; workflowId: string; currentNode: string }
  | { type: 'failed'; workflowId: string; error: string };

export interface WorkflowStatus {
  readonly workflowId: string;
  readonly state: 'running' | 'paused' | 'completed' | 'failed';
  readonly currentNode?: string;
  readonly completedNodes: readonly string[];
  readonly failedNodes: readonly string[];
}
```

- [ ] **Step 6: Create barrel export**

```typescript
// packages/ports/src/index.ts
/**
 * The Firm Ports — inbound use cases and outbound infrastructure contracts.
 *
 * Ports depend ONLY on domain types. No implementation details leak here.
 * Adapters implement these interfaces. Application services consume them.
 */

// Outbound ports (infrastructure needs)
export type { FileSystemPort, DirEntry } from './outbound/filesystem.js';
export type { AIProviderPort, AIStreamRequest, AIStreamEvent, AIMessage, AIModelInfo } from './outbound/ai-provider.js';
export type { EventBusPort, DomainEvent, Subscription } from './outbound/event-bus.js';
export type { SessionStorePort, SessionData, SessionSummary } from './outbound/session-store.js';

// Inbound ports (use case interfaces)
export type { DirectoryMapperPort } from './inbound/directory-mapper.js';
export type { MviValidatorPort, ValidationReport, FileValidation, NavigationError } from './inbound/mvi-validator.js';
export type { ContextManagerPort, Source, CaptureType, ContextFile, ValidationResult } from './inbound/context-manager.js';
export type { WorkflowRunnerPort, WorkflowResult, WorkflowStatus } from './inbound/workflow-runner.js';
```

- [ ] **Step 7: Write contract test**

```typescript
// packages/ports/test/ports-contract.test.ts
import { describe, it, expect } from 'vitest';

/**
 * Verify that all port exports are type-only (interfaces),
 * and that the ports package can import from domain without errors.
 * This is a compilation-time check, not a runtime check.
 */
describe('Ports contract', () => {
  it('ports barrel exports only types', async () => {
    const module = await import('../src/index.js');
    // All exports should be type-only (not runtime values)
    const keys = Object.keys(module);
    // Type-only exports don't appear in runtime module
    expect(keys).toHaveLength(0);
  });

  it('domain types are importable from ports', async () => {
    // This would fail at compile time if domain isn't a dependency
    const { ContextType } = await import('@digi4care/the-firm-domain');
    expect(ContextType.Project).toBe('project');
  });
});
```

- [ ] **Step 8: Install, build, test**

Run: `cd /home/digi4care/projects/the-firm && npm install`
Run: `cd /home/digi4care/projects/the-firm/packages/ports && npm run build`
Run: `cd /home/digi4care/projects/the-firm/packages/ports && npm test`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add packages/ports/ package.json package-lock.json
git commit -m "feat(ports): create ports package with inbound use cases and outbound infrastructure contracts"
```

---

## Task 10: Wire it up — NodeFileSystem adapter and `firm map` proof of concept

**Files:**
- Create: `packages/coding-agent/src/adapters/node-filesystem.ts`
- Create: `packages/coding-agent/src/adapters/directory-mapper-service.ts`
- Create: `packages/coding-agent/test/adapters/node-filesystem.test.ts`
- Create: `packages/coding-agent/test/adapters/directory-mapper-service.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/coding-agent/test/adapters/node-filesystem.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystem } from '../../src/adapters/node-filesystem.js';

describe('NodeFileSystem adapter', () => {
  let testDir: string;
  let fs: NodeFileSystem;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'firm-test-'));
    fs = new NodeFileSystem();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('reads text file', async () => {
    writeFileSync(join(testDir, 'test.md'), 'hello world');
    const content = await fs.readText(join(testDir, 'test.md'));
    expect(content).toBe('hello world');
  });

  it('writes text file', async () => {
    await fs.writeText(join(testDir, 'out.md'), 'written');
    const content = await fs.readText(join(testDir, 'out.md'));
    expect(content).toBe('written');
  });

  it('lists directory entries', async () => {
    writeFileSync(join(testDir, 'a.md'), 'a');
    mkdirSync(join(testDir, 'subdir'));
    const entries = await fs.list(testDir);
    expect(entries).toHaveLength(2);
    expect(entries.some((e) => e.name === 'a.md')).toBe(true);
    expect(entries.some((e) => e.name === 'subdir')).toBe(true);
  });

  it('exists returns true for existing file', async () => {
    writeFileSync(join(testDir, 'exists.md'), 'yes');
    expect(await fs.exists(join(testDir, 'exists.md'))).toBe(true);
    expect(await fs.exists(join(testDir, 'nope.md'))).toBe(false);
  });
});
```

```typescript
// packages/coding-agent/test/adapters/directory-mapper-service.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DirectoryMapperService } from '../../src/adapters/directory-mapper-service.js';
import { NodeFileSystem } from '../../src/adapters/node-filesystem.js';

describe('DirectoryMapperService', () => {
  let testDir: string;
  let mapper: DirectoryMapperService;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'firm-map-'));
    const fs = new NodeFileSystem();
    mapper = new DirectoryMapperService(fs);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('maps empty directory', async () => {
    const result = await mapper.map(testDir);
    expect(result.directory).toBe(testDir);
    expect(result.entries).toHaveLength(0);
  });

  it('maps directory with files', async () => {
    writeFileSync(join(testDir, 'guide.md'), 'line1\nline2\nline3');
    writeFileSync(join(testDir, 'standard.md'), 'line1');
    mkdirSync(join(testDir, 'subdir'));

    const result = await mapper.map(testDir);
    expect(result.entries).toHaveLength(3);
    expect(result.totalFiles).toBe(3);

    const guide = result.entries.find((e) => e.name === 'guide.md');
    expect(guide).toBeDefined();
    expect(guide!.lineCount).toBe(3);
  });

  it('caps entries at 20', async () => {
    for (let i = 0; i < 25; i++) {
      writeFileSync(join(testDir, `file-${i}.md`), 'content');
    }
    const result = await mapper.map(testDir);
    expect(result.entries).toHaveLength(20);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/digi4care/projects/the-firm/packages/coding-agent && npm test -- --reporter=verbose test/adapters/`
Expected: FAIL

- [ ] **Step 3: Add ports dependency to coding-agent**

Update `packages/coding-agent/package.json` dependencies:
```json
"@digi4care/the-firm-ports": "^0.0.1"
```

Run: `cd /home/digi4care/projects/the-firm && npm install`

- [ ] **Step 4: Implement NodeFileSystem adapter**

```typescript
// packages/coding-agent/src/adapters/node-filesystem.ts
/**
 * Node.js file system adapter implementing FileSystemPort.
 */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { FileSystemPort, DirEntry } from '@digi4care/the-firm-ports';

export class NodeFileSystem implements FileSystemPort {
  async readText(path: string): Promise<string> {
    return readFile(path, 'utf-8');
  }

  async writeText(path: string, content: string): Promise<void> {
    return writeFile(path, content, 'utf-8');
  }

  async list(dir: string): Promise<DirEntry[]> {
    const names = await readdir(dir);
    const entries: DirEntry[] = [];
    for (const name of names) {
      const fullPath = join(dir, name);
      const s = await stat(fullPath);
      entries.push({
        name,
        type: s.isDirectory() ? 'directory' : 'file',
        path: fullPath,
      });
    }
    return entries;
  }

  async exists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async readFileStats(path: string): Promise<import('@digi4care/the-firm-domain').FileInfo> {
    const content = await this.readText(path);
    const lines = content.split('\n');
    const lineCount = lines.length;
    const maxLineLength = Math.max(...lines.map((l) => l.length));
    const sectionCount = lines.filter((l) => /^## /.test(l)).length;
    let maxNesting = 0;
    for (const line of lines) {
      const match = line.match(/^(#+)\s/);
      if (match) {
        maxNesting = Math.max(maxNesting, match[1].length - 1);
      }
    }
    const mviWaived = content.startsWith('---\n') && content.includes('mvi: false');

    return Object.freeze({
      path,
      lineCount,
      sectionCount,
      maxNestingDepth: maxNesting,
      maxLineLength,
      mviWaived,
    });
  }
}
```

- [ ] **Step 5: Implement DirectoryMapperService**

```typescript
// packages/coding-agent/src/adapters/directory-mapper-service.ts
/**
 * DirectoryMapperService — implements DirectoryMapperPort.
 * Maps a .firm/ directory structure using the FileSystemPort.
 */
import type { DirectoryMapperPort } from '@digi4care/the-firm-ports';
import type { FileSystemPort } from '@digi4care/the-firm-ports';
import {
  createDirectoryMap,
  addEntry,
  type DirectoryMap,
} from '@digi4care/the-firm-domain';

const MAX_ENTRIES = 20;

export class DirectoryMapperService implements DirectoryMapperPort {
  constructor(private readonly fs: FileSystemPort) {}

  async map(scope?: string): Promise<DirectoryMap> {
    const dir = scope ?? '.';
    let map = createDirectoryMap(dir);

    const entries = await this.fs.list(dir);
    for (const entry of entries.slice(0, MAX_ENTRIES)) {
      let lineCount: number | undefined;
      if (entry.type === 'file') {
        try {
          const content = await this.fs.readText(entry.path);
          lineCount = content.split('\n').length;
        } catch {
          lineCount = undefined;
        }
      }
      map = addEntry(map, {
        name: entry.name,
        type: entry.type,
        lineCount,
      });
    }

    return map;
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /home/digi4care/projects/the-firm/packages/coding-agent && npm test -- --reporter=verbose test/adapters/`
Expected: ALL PASS

- [ ] **Step 7: Run full test suite**

Run: `cd /home/digi4care/projects/the-firm && npm test`
Expected: ALL PASS (no regressions)

- [ ] **Step 8: Commit**

```bash
git add packages/coding-agent/src/adapters/ packages/coding-agent/test/adapters/ packages/coding-agent/package.json package.json package-lock.json
git commit -m "feat(coding-agent): add NodeFileSystem adapter and DirectoryMapperService proving hexagonal wiring"
```

---

## Task 11: Update ADR and documentation

**Files:**
- Create: `docs/adr/0005-hexagonal-architecture.md`
- Modify: `docs/product/07-current-state-brownfield-assessment.md`
- Modify: `docs/product/02-architecture-three-layer-model.md`

- [ ] **Step 1: Write ADR-0005**

```markdown
# ADR-0005: Adopt Hexagonal Architecture (Ports & Adapters)

**Status**: Accepted
**Date**: 2026-04-13

## Context

The Firm's codebase is a brownfield fork where business logic, infrastructure,
and I/O are entangled. `AgentSession` is a 3300+ line class mixing domain logic
with file I/O, provider details, and UI rendering. There is no isolated domain
layer. The PRD defines clear domain concepts (ContextProfile, WorkflowDefinition,
ModelPolicy) but they have no code representation.

## Decision

Introduce hexagonal architecture with two new packages:

1. `@digi4care/the-firm-domain` — pure business logic, zero dependencies
2. `@digi4care/the-firm-ports` — interface contracts for use cases and infrastructure

Dependency direction: adapters → ports → domain. Never reversed.

Existing packages become adapters. New features go through ports.

## Consequences

### Positive
- Domain logic is testable without mocks (pure functions)
- New PRD features (workflows, context operations) have a clear home
- Provider swaps require no domain changes
- Future adapters (different CLI, web-only, API) reuse same domain

### Negative
- Two new packages to maintain
- Initial wiring overhead per feature
- Requires discipline to keep domain pure

### Mitigation
- Start with one proof-of-concept use case (`firm map`)
- Existing code is not refactored — new architecture coexists
- Gradual migration per PRD phase
```

- [ ] **Step 2: Update brownfield assessment**

Add to "What works now" section:
```
- ✅ Hexagonal architecture foundation — domain + ports packages
- ✅ First adapter wired — NodeFileSystem + DirectoryMapperService
```

Add to "What exists as research/planning":
```
- ⚠️ Hexagonal domain layer — core types defined, adapters for remaining ports pending
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0005-hexagonal-architecture.md docs/product/07-current-state-brownfield-assessment.md docs/product/02-architecture-three-layer-model.md
git commit -m "docs: add ADR-0005 hexagonal architecture, update product docs"
```

---

## Summary

| Task | What | Tests | Commit |
|------|------|-------|--------|
| 1 | Domain package skeleton | build check | `feat(domain): create domain package skeleton` |
| 2 | Branded types | 3 tests | `feat(domain): add branded type utility` |
| 3 | ContextProfile (4 dimensions) | 8 tests | `feat(domain): add ContextProfile value object` |
| 4 | MemoryArtifact + lifecycle + promote | 7 tests | `feat(domain): add MemoryArtifact, lifecycle, promote` |
| 5 | ModelReference + FallbackChain | 10 tests | `feat(domain): add ModelReference, FallbackChain` |
| 6 | DAG validator + workflow types | 7 tests | `feat(domain): add DAG validator` |
| 7 | MVI rules + DirectoryMap | 7 tests | `feat(domain): add MVI rules, DirectoryMap` |
| 8 | AgentStructure + Template | 6 tests | `feat(domain): add AgentStructure, Template` |
| 9 | Ports package (all interfaces) | 2 tests | `feat(ports): create ports package` |
| 10 | NodeFileSystem adapter + firm map PoC | 7 tests | `feat(coding-agent): add adapters proving hexagonal wiring` |
| 11 | ADR + documentation | — | `docs: add ADR-0005` |

**Total: ~57 tests, 0 regressions, 11 commits**

After this plan, the codebase has:
- A pure `domain` package with **zero dependencies** — all PRD concepts as value objects
- A `ports` package defining **use case interfaces** (inbound) and **infrastructure contracts** (outbound)
- A working proof of concept: `firm map` flows through domain → ports → adapter
- An ADR documenting the architectural decision
- Zero breaking changes to existing functionality
