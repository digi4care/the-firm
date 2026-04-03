---
name: finding-skills
description: Discover project-relevant skills, prefer local skills first, search externally when needed, and require audit plus optimization before adoption. Use when users want to know what skills a repo or task needs.
allowed-tools: Bash Read Write Edit
---

# Finding Skills

A The Firm meta-skill for deciding which specialized skills a project likely needs.

## When to Use Me

Use me when:

- the user asks what skills a project or repo needs
- the current task suggests a capability gap in the local skill set
- a repo would benefit from a specialized skill but none is obviously present
- you need to search externally for a likely skill match
- you want to adopt a downloaded skill safely into the repo

Do not use me for:

- generic OMP usage questions
- provider configuration questions unrelated to skill discovery
- direct bug-fixing or implementation work
- conceptual discussion of The Firm without an actual skill-gap question

## Workflow

### Step 1: Inspect Local Skills First

List available local skills to check for a strong fit:

```bash
ls -la .pi/skills/
```

If a local skill matches the capability gap, prefer it and stop here.

### Step 2: Check External Search Availability

Run the helper script to determine if API-backed search is available:

```bash
bun .pi/skills/finding-skills/scripts/load-skillsmp-env.ts
```

This outputs JSON with:

- `found`: whether the API key exists
- `repoRoot`: resolved repository root
- `envPath`: path to the env file (if exists)
- `masked`: masked API key for diagnostics
- `message`: human-readable status
- `warning`: null or a warning about missing configuration
- `example`: example `.env` line if key is missing
- `getKeyFrom`: URL to obtain an API key

**If `.pi/.env` or `SKILLSMP_API_KEY` is missing:**

- Continue without API-backed search
- The helper outputs a warning, example, and documentation URL
- Use fallback sources (curated registries, GitHub search)

### Step 3: Search for External Skills (if no local fit)

With API key: use SkillsMP API for targeted search.
Without API key: use fallback sources (curated registries, GitHub search).

Collect only the minimum relevant candidate skills or source materials.

### Step 4: Inspect Downloaded Candidates

If skills are downloaded as ZIP archives to `downloads/`, inspect them:

```bash
bun .pi/skills/finding-skills/scripts/inspect-downloaded-skills.ts
```

This outputs JSON with:

- `repoRoot`: resolved repository root
- `downloadsDir`: path to downloads directory
- `candidates`: array of skill candidates with metadata
  - `zipPath`: path to the ZIP file
  - `folderName`: extracted folder name
  - `skillName`: name from SKILL.md frontmatter (if found)
  - `description`: description from SKILL.md or description_en.txt
  - `skillMdPath`: path to `SKILL.md` inside the archive, or null if absent
  - `recommendedNextStep`: actionable recommendation

### Step 5: Synthesize Overlapping Candidates

If several downloaded skills partially solve the same problem, treat them as **source material** for one optimized repo-local skill. Do not adopt multiple overlapping skills wholesale.

Example synthesis decision:

- Three downloaded skills: `docker-basic`, `docker-compose`, `docker-deploy`
- One repo-local skill: `docker-workflow` (optimized from all three)

### Step 6: Audit Before Adoption

**Required.** Before any adoption, run an audit pass:

```bash
# Using skill-creator extension (if available)
# Read the candidate SKILL.md and validate:
# - Completeness (triggers, workflow, error handling, tests, references)
# - Quality (word count, specific vs generic language)
# - Safety (no hardcoded secrets, appropriate tool permissions)
```

If audit fails (missing SKILL.md, incomplete structure, security concerns), **block adoption**.

### Step 7: Optimize Before Adoption

**Required.** After audit, run optimization through the `skill-creator` workflow:

- Use `skill-creator-optimize` in dry-run mode first
- Keep the quality gate enabled
- If several downloaded skills are being synthesized, optimize the single merged repo-local skill draft rather than adopting the overlapping downloads separately

Optimization ensures:

- Triggers are specific and accurate
- Workflow matches repo conventions
- References are valid
- Quality score meets minimum threshold

Optimization ensures:

- Triggers are specific and accurate
- Workflow matches repo conventions
- References are valid
- Quality score meets minimum threshold

### Step 8: Explicit Adoption Decision

Only after audit + optimization is the skill considered adoptable. The final adoption requires explicit operator decision:

```bash
# Move optimized skill into active skills directory
mv <optimized-skill-path> .pi/skills/<skill-name>/
```

## Error Handling

- If `.pi/.env` is missing, continue without API-backed search. The helper script outputs:

  ```json
  {
    "found": false,
    "warning": "SkillsMP API-backed search is unavailable until you create .pi/.env with a valid SKILLSMP_API_KEY.",
    "example": "SKILLSMP_API_KEY=sk_live_your_real_key_here",
    "getKeyFrom": "https://skillsmp.com/docs/api"
  }
  ```

- If `SKILLSMP_API_KEY` is missing, same behavior as above.

- If no trustworthy local or external skill is found, report that result instead of inventing one.

- If a downloaded skill fails audit, block adoption. Document why.

- If optimization would reduce quality or conflict with repo conventions, keep the skill out of the active set.

## Quick Tests

Should trigger:

- "What skills do we need for this repo?"
- "Find relevant skills for this brownfield project."
- "Search for a skill we can adopt for this task."

Should not trigger:

- "How do I configure OMP providers?"
- "Fix this failing test."
- "Explain The Firm conceptually."

Functional:

- Prefers local `.pi/skills/` before external search.
- Reads `SKILLSMP_API_KEY` from `.pi/.env` through a TypeScript helper script.
- Uses multiple downloaded skills as source material when one optimized repo-local skill would be cleaner.
- Requires audit before adoption.
- Requires optimization before a downloaded or synthesized skill is treated as active.

## References

- `references/discovery-guide.md`
- `.pi/skills/skill-creator/SKILL.md`

## Operational Notes

### Helper Scripts

**Check API-key availability:**

```bash
bun .pi/skills/finding-skills/scripts/load-skillsmp-env.ts
```

**Inspect downloaded ZIP candidates:**

```bash
bun .pi/skills/finding-skills/scripts/inspect-downloaded-skills.ts
```

### Skill-Creator Integration

This skill assumes the project-local extension `.pi/extensions/skill-creator.ts` remains present so audit and optimization tooling are available through the OMP extension system.

### Synthesis Rule

If several downloaded skills partially solve the same problem, prefer producing one optimized repo-local skill from them instead of adopting multiple overlapping skills wholesale.

The downloaded skills are source material, not necessarily the final runtime shape.

### Adoption Rule

A downloaded skill is not considered active just because it exists on disk.

It becomes adoptable only after:

1. Audit pass (structure, quality, safety validated)
2. Optimization pass (triggers refined, conventions matched)
3. Explicit operator decision to move into `.pi/skills/`

### Downloaded ZIP Inspection

Inspect candidates under `downloads/` with:

```bash
bun .pi/skills/finding-skills/scripts/inspect-downloaded-skills.ts
```

Output includes:

- Candidate count and ZIP file list
- Per-candidate metadata (skill name, description, SKILL.md presence)
- Recommended next step for each candidate

### Security Rule

Never commit a real `.pi/.env` file.
Use `.pi/.env.example` as the setup template.

---

## End-to-End Summary

| Step                 | Command/Action                                                        | Output                                |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------- |
| 1. Local check       | `ls .pi/skills/`                                                     | Local skill list                      |
| 2. API check         | `bun .pi/skills/finding-skills/scripts/load-skillsmp-env.ts`         | JSON with availability                |
| 3. External search   | SkillsMP API or fallback                                              | Candidate list                        |
| 4. Inspect downloads | `bun .pi/skills/finding-skills/scripts/inspect-downloaded-skills.ts` | JSON with metadata plus adoption plan |
| 5. Synthesis         | Evaluate overlap in the inspection plan                               | Source material selection             |
| 6. Audit             | `skill-creator-audit` workflow                                        | Pass/fail with reasons                |
| 7. Optimize          | `skill-creator-optimize` workflow                                     | Optimized skill output                |
| 8. Adopt             | `mv <skill> .pi/skills/`                                             | Active skill in repo                  |
