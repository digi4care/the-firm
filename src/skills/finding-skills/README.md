# finding-skills

A The Firm meta-skill for discovering which skills a project likely needs.

## What it does

- Inspects the repo and task context
- Prefers existing local skills first
- Searches externally only when there is no strong local fit
- Treats multiple downloaded candidate skills as source material when one optimized repo-local skill would be cleaner
- Requires audit before adoption
- Requires optimization before a downloaded or synthesized skill is treated as active

## Quick Start

### 1. Check Local Skills
```bash
ls .pi/skills/
```

### 2. Check External Search Availability
```bash
bun .pi/skills/finding-skills/scripts/load-skillsmp-env.ts
```

**If `.pi/.env` or `SKILLSMP_API_KEY` is missing:**
- The script outputs a clear warning
- Provides an example `.env` line: `SKILLSMP_API_KEY=sk_live_your_real_key_here`
- Points to `https://skillsmp.com/docs/api` for obtaining a key
- You can continue with fallback sources (curated registries, GitHub)

### 3. Inspect Downloaded Candidates and Adoption Plan
```bash
bun .pi/skills/finding-skills/scripts/inspect-downloaded-skills.ts
```
The JSON output includes candidate metadata, local-skill inventory, external-search status, and a step-by-step adoption plan covering audit, optimization, and synthesis opportunities.

## Required Sequence Before Adoption

A downloaded skill **must not** be adopted until:

1. **Audit** — validate structure, quality, safety
2. **Optimize** — refine triggers, match repo conventions
3. **Explicit decision** — operator approves and moves to `.pi/skills/`

## Synthesis Rule

If several downloaded candidate skills overlap around one capability, the preferred outcome is **one optimized repo-local skill** built from those sources, not multiple overlapping skills installed side by side.

Example:
- Input: `docker-basic.zip`, `docker-compose.zip`, `docker-deploy.zip`
- Output: One `docker-workflow` skill in `.pi/skills/`

## Important Rule

Do not commit `.pi/.env`.
Use `.pi/.env.example` as the local setup template.

## Reference

See `SKILL.md` for the complete operational workflow.
See `references/discovery-guide.md` for detailed search order and rules.

## Available Scripts

| Script | Purpose | Output |
|--------|---------|--------|
| `load-skillsmp-env.ts` | Check API key availability | JSON with status, warnings, example |
| `inspect-downloaded-skills.ts` | Inspect ZIP candidates and plan adoption | JSON with candidate metadata plus audit/optimize/synthesis plan |

## Workflow Summary

```
Local check → API check → External search → Inspect downloads
                                             ↓
                    Synthesis (if overlapping) → Audit → Optimize → Adopt
```

Only after all steps is the skill considered active in the repo.

## When External Search is Unavailable

If you don't have a SkillsMP API key:

1. The helper script will warn you and show an example
2. You can still search fallback sources (curated registries, GitHub)
3. Download candidates manually to `downloads/`
4. Inspect with `inspect-downloaded-skills.ts`
5. Follow the audit → optimize → adopt sequence

This ensures the workflow remains usable even without API access.

## Downloaded Skills as Source Material

Downloaded skills are **not** automatically active. They are:
- Inspected for content and quality
- Potentially synthesized with other candidates
- Audited for safety and completeness
- Optimized to match repo conventions
- Only then considered for adoption

Treat downloaded skills as raw material, not finished products.

## See Also

- `references/discovery-guide.md` — detailed search order and rules
- `.pi/skills/skill-creator/SKILL.md` — audit and optimization workflow
- `scripts/load-skillsmp-env.ts` — API key checker source
- `scripts/inspect-downloaded-skills.ts` — ZIP inspector source
