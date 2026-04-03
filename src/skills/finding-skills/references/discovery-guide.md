# Discovery Guide

## Goal

Find the minimum relevant skill set for the current repo and task.

## Search Order

1. **Inspect local** `.pi/skills/` first — prefer existing local skills
2. **Check search availability** — run `load-skillsmp-env.ts` to determine if API-backed search is possible
3. **Search external sources** — only if no suitable local skill exists
4. **Synthesize if overlapping** — treat multiple overlapping candidates as source material for one optimized repo-local skill
5. **Audit downloaded candidates** — required before any adoption
6. **Optimize before adoption** — refine to match repo conventions
7. **Explicit adoption decision** — only then treat the skill as adoptable

## Step-by-Step Workflow

### Step 1: Local Skill Check

Before any external search, verify if a local skill already covers the capability gap:

```bash
ls -la .pi/skills/
cat .pi/skills/<candidate-skill>/SKILL.md
```

If a strong local fit exists, use it and stop.

### Step 2: Check External Search Availability

Run the helper to determine if SkillsMP API is available:

```bash
bun .pi/skills/finding-skills/scripts/load-skillsmp-env.ts
```

**Output format (JSON):**
```json
{
  "found": true,
  "repoRoot": "/path/to/repo",
  "envPath": "/path/to/repo/.pi/.env",
  "keyName": "SKILLSMP_API_KEY",
  "masked": "sk_live...abcd",
  "message": "SkillsMP API key loaded from .pi/.env.",
  "warning": null,
  "example": null,
  "getKeyFrom": null
}
```

**When `.pi/.env` or `SKILLSMP_API_KEY` is missing:**
```json
{
  "found": false,
  "repoRoot": "/path/to/repo",
  "envPath": "/path/to/repo/.pi/.env",
  "keyName": "SKILLSMP_API_KEY",
  "masked": null,
  "message": "No SkillsMP API key found in .pi/.env.",
  "warning": "SkillsMP API-backed search is unavailable until you add SKILLSMP_API_KEY to .pi/.env.",
  "example": "SKILLSMP_API_KEY=sk_live_your_real_key_here",
  "getKeyFrom": "https://skillsmp.com/docs/api"
}
```

**Behavior when unavailable:**
- Continue without API-backed search
- Use fallback sources (curated registries, GitHub)
- Helper provides example and documentation URL for setup

### Step 3: External Search (if no local fit)

**With API key:** Use SkillsMP API for targeted search
**Without API key:** Use fallback sources (curated registries, GitHub search)

Collect minimum relevant candidates. Do not over-collect.

### Step 4: Inspect Downloaded Candidates

If candidates are downloaded as ZIP files to `downloads/`:

```bash
bun .pi/skills/finding-skills/scripts/inspect-downloaded-skills.ts
```

**Output format (JSON):**
```json
{
  "repoRoot": "/path/to/repo",
  "downloadsDir": "/path/to/repo/downloads",
  "zipFiles": ["skill-a.zip", "skill-b.zip"],
  "candidates": [
    {
      "zipPath": "/path/to/repo/downloads/skill-a.zip",
      "folderName": "skill-a",
      "skillName": "docker-workflow",
      "description": "Docker container and compose management",
      "statsJsonPresent": true,
      "skillMdPath": "skill-a/SKILL.md",
      "descriptionEnPath": null,
      "recommendedNextStep": "Extract, audit, and optimize before adoption."
    }
  ],
  "message": "Downloaded skill candidates inspected."
}
```

**No candidates found:**
```json
{
  "repoRoot": "/path/to/repo",
  "downloadsDir": "/path/to/repo/downloads",
  "zipFiles": [],
  "candidates": [],
  "message": "No ZIP skill candidates found."
}
```

### Step 5: Synthesis Decision

**When to synthesize:** If several candidate skills overlap around one capability area.

**Preferred outcome:** One optimized repo-local skill built from multiple sources, not multiple overlapping skills side by side.

**Example:**
- Candidates: `docker-basic`, `docker-compose`, `docker-deploy`
- Synthesis: One `docker-workflow` skill combining all three

**Decision criteria:**
- Do candidates share the same core domain? → Synthesize
- Are candidates complementary but distinct? → Consider separate adoption
- Is one clearly superior? → Audit and optimize just that one

### Step 6: Audit Before Adoption (Required)

Before any adoption, perform an audit pass:

**Audit checklist:**
- [ ] SKILL.md exists and has valid frontmatter
- [ ] Triggers section is specific (not generic)
- [ ] Workflow section is actionable
- [ ] Error handling covers key failure modes
- [ ] Tests section has concrete examples
- [ ] References are valid and reachable
- [ ] No hardcoded secrets or credentials
- [ ] Tool permissions are appropriate

**If audit fails:** Block adoption. Document why.

### Step 7: Optimize Before Adoption (Required)

After audit, optimize through the `skill-creator` workflow rather than adopting the downloaded skill as-is:

- Use `skill-creator-optimize` in dry-run mode first
- Keep the quality gate enabled
- If multiple downloaded skills are being synthesized, optimize the single merged repo-local skill draft rather than optimizing overlapping downloads independently

**Optimization goals:**
- Refine triggers for specificity
- Match repo conventions (naming, structure)
- Validate references exist
- Ensure quality score meets threshold

### Step 8: Explicit Adoption Decision

Only after audit + optimization is the skill adoptable:

```bash
# Operator explicitly moves skill into active directory
mv <optimized-skill-path> .pi/skills/<skill-name>/
```

## External Search Sources

- **SkillsMP API** — when `SKILLSMP_API_KEY` is available in `.pi/.env`
- **Fallback sources** — curated registries, GitHub search, when API is unavailable

## Hard Rule

A downloaded skill **must never** become active in the repo without:

1. **Audit** — structure, quality, safety validated
2. **Optimization** — refined for repo conventions
3. **Explicit adoption decision** — operator approves

No exceptions. A skill on disk is not an active skill.

## Handling Missing Configuration

### No `.pi/.env` file

**Symptom:** Helper outputs `"message": "No .pi/.env file found in the active repository."`

**Action:**
1. Create `.pi/.env` from `.pi/.env.example`
2. Add `SKILLSMP_API_KEY=sk_live_your_real_key_here`
3. Get a key from `https://skillsmp.com/docs/api`
4. Continue with or without API (fallback sources available)

### No `SKILLSMP_API_KEY`

**Symptom:** Helper outputs `"message": "No SkillsMP API key found in .pi/.env."`

**Action:**
1. Add the key to `.pi/.env`
2. Or continue with fallback search sources

## Synthesis Examples

### Example 1: Docker Skills

**Candidates:**
- `docker-basic.zip` — container basics
- `docker-compose.zip` — multi-container
- `docker-deploy.zip` — deployment

**Synthesis:** One `docker-workflow` skill covering all three aspects

**Why:** Same domain, better as unified workflow

### Example 2: Database Skills

**Candidates:**
- `postgres-admin.zip` — PostgreSQL administration
- `redis-cache.zip` — Redis caching

**Decision:** Keep separate

**Why:** Different domains, distinct use cases

### Example 3: Testing Skills

**Candidates:**
- `unit-testing.zip` — basic unit tests
- `integration-testing.zip` — integration tests
- `e2e-testing.zip` — end-to-end tests

**Synthesis:** One `testing-strategy` skill with sections for each level

**Why:** Related capability, unified guidance preferred

## Decision Matrix

| Situation | Action |
|-----------|--------|
| Strong local skill exists | Use local, stop |
| API key available | Search SkillsMP API |
| No API key | Use fallback sources |
| Multiple overlapping candidates | Synthesize to one skill |
| Distinct complementary candidates | Audit each separately |
| Audit fails | Block adoption, document why |
| Optimization reduces quality | Keep out of active set |
| Audit + optimization pass | Adopt if operator approves |

## Summary

The workflow ensures:
1. Local skills are preferred
2. External search is capability-aware (API or fallback)
3. Downloaded skills are inspected before any action
4. Overlapping candidates become one optimized skill
5. Audit and optimization are mandatory gates
6. Adoption is explicit, not automatic

This produces a minimal, high-quality skill set appropriate for the repo.
