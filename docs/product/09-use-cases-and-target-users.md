# 09 - Use Cases and Target Users

> **Overview:** Who uses The Firm and for what.

---

## Target Users

| Persona | Role | What they need |
|---------|------|---------------|
| **Solo developer** | Writes code with AI help | Structured workflows, durable memory, model policy |
| **Tech lead** | Manages a team + codebase | Repeatable workflows, standards enforcement, review gates |
| **Agency / Studio** | Delivers client projects | Professional engagement flow, communication templates, governance |
| **Content creator** | Writes with AI assistance | Content workflows, tone-of-voice context, SEO templates |
| **Open source maintainer** | Maintains a public repo | Triage workflows, contributor templates, review standards |

---

## Primary Use Cases

### 1. Plan → Build → Review
**Who:** Solo developer, tech lead
**Flow:** Intake brief → Plan → Approve → Implement → Review → Deliver

```
"I need to add OAuth integration"
    ↓
[intake brief] → classify as "feature"
    ↓
[plan] → agent creates plan document with decisions and risks
    ↓
[approve] → human reviews and approves
    ↓
[build] → agent implements with scoped context
    ↓
[review] → reviewer agent checks against standards
    ↓
[deliver] → handoff brief + capture decisions to memory
```

### 2. Brainstorm & Design
**Who:** Tech lead, agency
**Flow:** Intake → Brainstorm → Scope → ADR → Plan

```
"We need to redesign the auth layer"
    ↓
[intake] → classify as "architecture"
    ↓
[brainstorm] → creative model, multiple perspectives
    ↓
[scope] → define boundaries, constraints
    ↓
[ADR] → capture architecture decision
    ↓
[plan] → create implementation plan
```

### 3. Content Pipeline
**Who:** Content creator, agency
**Flow:** Brief → Draft → Review → Publish

```
"Write a blog post about our new API"
    ↓
[brief] → intake with audience, tone, SEO keywords
    ↓
[draft] → creative model, tone-of-voice context
    ↓
[review] → editorial review against standards
    ↓
[publish] → deliver formatted content
```

### 4. Code Review
**Who:** Solo developer, tech lead
**Flow:** Submit → Analyze → Report

```
"Review the PR for security issues"
    ↓
[submit] → load code + review standards
    ↓
[analyze] → thorough model, security patterns context
    ↓
[report] → review findings template, ranked by severity
```

### 5. Project Onboarding
**Who:** New team member, AI agent
**Flow:** Scan → Extract → Context → Ready

```
"Onboard to this project"
    ↓
[scan] → AI analyzes codebase
    ↓
[extract] → pull standards, patterns, conventions into context
    ↓
[organize] → structure into .firm/context/
    ↓
[ready] → agent now works with project-specific knowledge
```

---

## Cross-Cutting Capabilities

These apply across all use cases:

| Capability | What it adds |
|-----------|-------------|
| **Context profiles** | Right context, right phase, right form |
| **Model policy** | Creative for brainstorm, fast for build, thorough for review |
| **Templates** | Standardized communication, less ambiguity |
| **Memory** | Decisions and patterns survive across sessions |
| **Approval gates** | Human stays in control |
| **Archon workflows** | Community ecosystem accessible |
