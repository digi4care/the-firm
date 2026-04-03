# Analysis Templates

Report templates for different analysis types.

## Quick Overview Template

```markdown
## Quick Overview: owner/repo

### Basic Info
- **Language**: [primary language]
- **Package Manager**: [npm/pip/cargo/etc]
- **License**: [license type]

### Purpose
[One paragraph describing what the project does]

### Structure
```

repo/
├── src/          # [purpose]
├── tests/        # [purpose]
├── docs/         # [purpose]
└── package.json  # [key dependencies]

```

### Quick Assessment
- **Activity**: [active/maintenance/archived]
- **Popularity**: [stars, forks]
- **Health**: [CI status, recent commits]

### Bottom Line
[1-2 sentences: should you use this?]
```

## Architecture Deep Dive Template

```markdown
## Architecture Analysis: owner/repo

### Overview
[2-3 sentences about the project's purpose and scale]

### Technology Stack
| Layer | Technology |
|-------|------------|
| Language | [TypeScript/Python/Rust/etc] |
| Runtime | [Node/Bun/Deno/Python/etc] |
| Framework | [React/Svelte/FastAPI/etc] |
| Build | [Vite/esbuild/turbo/etc] |
| Test | [Jest/Vitest/Pytest/etc] |

### Directory Structure
```

repo/
├── packages/           # Monorepo packages
│   ├── core/          # Core library
│   ├── cli/           # CLI tool
│   └── utils/         # Shared utilities
├── apps/              # Applications
├── docs/              # Documentation
└── tools/             # Build tools

```

### Entry Points
| Entry | Purpose |
|-------|---------|
| `src/index.ts` | Main export |
| `src/cli.ts` | CLI entry |
| `src/server.ts` | Server entry |

### Key Patterns
1. **[Pattern Name]**: [where used, why]
2. **[Pattern Name]**: [where used, why]

### Data Flow
```

[Input] → [Processing] → [Output]

```

### Dependencies
| Category | Key Packages |
|----------|--------------|
| Core | [list] |
| Dev | [list] |
| Peer | [list] |
```

## Quality Assessment Template

```markdown
## Quality Assessment: owner/repo

### Test Coverage
- **Framework**: [Jest/Vitest/etc]
- **Test Files**: [count]
- **Coverage**: [estimated % if available]
- **Types**: [unit/integration/e2e]

### Code Quality
| Metric | Status | Details |
|--------|--------|---------|
| TypeScript | ✓/✗ | strict: [true/false] |
| ESLint | ✓/✗ | config: [airbnb/standard/etc] |
| Prettier | ✓/✗ | formatted |
| Husky | ✓/✗ | pre-commit hooks |

### Documentation
| Doc Type | Quality | Notes |
|----------|---------|-------|
| README | [1-5] | [notes] |
| API Docs | [1-5] | [notes] |
| Examples | [1-5] | [notes] |
| Contributing | [1-5] | [notes] |

### CI/CD
- **Platform**: [GitHub Actions/Travis/etc]
- **Checks**: [lint/test/build/etc]
- **Status**: [passing/failing]

### Maintenance
- **Last Commit**: [date]
- **Release Frequency**: [regular/irregular]
- **Issue Response**: [fast/slow/none]

### Quality Score: [X/10]
[Explanation of score]
```

## Full Analysis Template

```markdown
## Full Analysis: owner/repo

### Executive Summary
[3-5 sentences covering purpose, quality, and recommendation]

---

### 1. Overview
- **Name**: [repo name]
- **Description**: [from README]
- **Author**: [owner]
- **License**: [license]
- **Created**: [date]
- **Last Updated**: [date]

### 2. Statistics
| Metric | Value |
|--------|-------|
| Stars | [count] |
| Forks | [count] |
| Watchers | [count] |
| Open Issues | [count] |
| Contributors | [count] |

### 3. Technology
[Detailed technology breakdown]

### 4. Architecture
[Full architecture analysis]

### 5. Code Quality
[Complete quality assessment]

### 6. Community
- **Activity**: [analysis of commit frequency]
- **Responsiveness**: [issue/PR response time]
- **Governance**: [how decisions are made]

### 7. Suitability Assessment
| Use Case | Suitable? | Notes |
|----------|-----------|-------|
| Production | ✓/✗/? | [notes] |
| Learning | ✓/✗/? | [notes] |
| Contribution | ✓/✗/? | [notes] |
| Fork/Modify | ✓/✗/? | [notes] |

### 8. Risks
1. **[Risk 1]**: [description, mitigation]
2. **[Risk 2]**: [description, mitigation]

### 9. Recommendations
[Specific recommendations based on analysis]

### 10. Permalinks
- README: https://github.com/owner/repo/blob/[sha]/README.md
- Package: https://github.com/owner/repo/blob/[sha]/package.json
- Source: https://github.com/owner/repo/tree/[sha]/src
```

## Library Evaluation Template

```markdown
## Library Evaluation: library-name

### Purpose
[What problem does this library solve?]

### Alternatives
| Library | Stars | Pros | Cons |
|---------|-------|------|------|
| [This] | [n] | [pros] | [cons] |
| [Alt 1] | [n] | [pros] | [cons] |
| [Alt 2] | [n] | [pros] | [cons] |

### API Quality
- **Design**: [intuitive/complex/etc]
- **Types**: [TypeScript support]
- **Docs**: [quality assessment]

### Bundle Size
- **Minified**: [size]
- **Gzipped**: [size]
- **Dependencies**: [count]

### Verdict
**Recommendation**: [Use/Consider/Avoid]
**Confidence**: [High/Medium/Low]

**Reasoning**:
[2-3 sentences explaining the recommendation]
```
