# Quality Checklist

Checklist for assessing repository quality.

## Structure Checklist

- [ ] Clear directory organization
- [ ] Source code in dedicated directory (src/, lib/, app/)
- [ ] Tests in dedicated directory (test/, tests/, __tests__/)
- [ ] Documentation present (docs/, README.md)
- [ ] Configuration files organized (not scattered)
- [ ] No deeply nested directories (>4 levels)

## README Checklist

- [ ] Project description clear
- [ ] Installation instructions
- [ ] Usage examples
- [ ] API documentation or link
- [ ] Contributing guidelines
- [ ] License specified
- [ ] Badges present (CI, coverage, version)

## Code Quality Checklist

### TypeScript/JavaScript

- [ ] TypeScript used (`.ts` files)
- [ ] `strict: true` in tsconfig.json
- [ ] ESLint configured
- [ ] Prettier configured
- [ ] No `any` types (or minimal)
- [ ] Types exported for consumers

### Python

- [ ] Type hints used
- [ ] mypy configured
- [ ] Black/Ruff configured
- [ ] pyproject.toml present

### Rust

- [ ] Clippy configured
- [ ] rustfmt configured
- [ ] Documentation comments (`///`)

## Testing Checklist

- [ ] Test framework configured
- [ ] Unit tests present
- [ ] Integration tests present (if applicable)
- [ ] Test coverage reported
- [ ] Coverage threshold enforced
- [ ] E2E tests (for apps)

### Test Quality

- [ ] Tests are readable
- [ ] Tests are isolated
- [ ] Tests cover edge cases
- [ ] Tests cover error paths
- [ ] Mocks used appropriately

## CI/CD Checklist

- [ ] CI pipeline configured
- [ ] Tests run on every PR
- [ ] Linting run on every PR
- [ ] Build verified
- [ ] Automated releases (if applicable)
- [ ] Security scanning (if applicable)

## Documentation Checklist

- [ ] README.md complete
- [ ] API documentation
- [ ] Code examples
- [ ] Changelog present
- [ ] Migration guides (for breaking changes)
- [ ] Architecture decision records (for large projects)

## Dependency Checklist

- [ ] Dependencies up to date
- [ ] No known vulnerabilities (`npm audit`)
- [ ] Minimal dependencies
- [ ] Dependencies well-maintained
- [ ] Lock file committed

## Maintenance Checklist

- [ ] Active development (commits in last 6 months)
- [ ] Issues triaged regularly
- [ ] PRs reviewed promptly
- [ ] Releases tagged properly
- [ ] Semantic versioning followed

## Security Checklist

- [ ] No secrets in code
- [ ] Dependencies scanned
- [ ] Security policy present
- [ ] Responsible disclosure process
- [ ] Dependabot/Renovate configured

## Scoring Guide

| Category | Weight | Excellent | Good | Poor |
|----------|--------|-----------|------|------|
| Structure | 10% | All items | 80% items | <60% items |
| Documentation | 20% | All items | 80% items | <60% items |
| Code Quality | 25% | All items | 80% items | <60% items |
| Testing | 25% | >80% coverage | 50-80% | <50% |
| CI/CD | 10% | Full pipeline | Basic CI | None |
| Maintenance | 10% | Active | Maintenance | Abandoned |

### Score Interpretation

| Score | Grade | Recommendation |
|-------|-------|----------------|
| 90-100 | A | Excellent choice, production-ready |
| 80-89 | B | Good choice, minor concerns |
| 70-79 | C | Acceptable, evaluate risks |
| 60-69 | D | Caution, significant concerns |
| <60 | F | Avoid, serious issues |

## Red Flags

- No tests at all
- No CI configuration
- Last commit >1 year ago
- Many open issues without response
- Dependencies with critical vulnerabilities
- No license specified
- Poor or misleading README
- Deeply nested code structure
- Large files committed (binaries, data)
- Hardcoded credentials or secrets

## Green Flags

- High test coverage (>80%)
- Active development (commits this month)
- Responsive to issues and PRs
- Clear contributing guidelines
- Well-structured monorepo (if applicable)
- Automated releases
- Comprehensive documentation
- Type definitions included
- Bundle size monitored
- Security policy present
