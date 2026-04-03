# Anti-Slop Patterns for AI Agents

> Techniques top engineers use to prevent AI agents from writing slop in production codebases.

---

## Mindset Shift

**LLM code ≠ Slop**. If LLMs are writing slop, that's an engineering problem, not an LLM problem. The models are capable of writing high-quality code—it's your job to create the conditions for success.

---

## The Number One Rule

**Never fix bad output.** If an agent produces bad results:

1. Diagnose the cause
2. Reset the run
3. Fix the underlying issue
4. Rerun from scratch

Don't waste time fixing technical debt from bad agent runs. Scrap and retry.

---

## Tools

### 1. Hooks

First layer of defense. Hooks allow you to:

- Create custom harnesses around agents
- Produce logging
- Stop destructive changes before they happen

**Examples:**

- Pre-commit hooks: run tests, linting before commits
- Block certain actions (e.g., `git push`)
- Log all agent actions

### 2. Quality Gates

Enforce the **strictest possible rules**:

- Strictest linting
- Strictest type-checking
- 100% test pass rate

Every test must pass before code moves to the next agent or gets pushed.

### 3. Anti-Mocking Testing Philosophy

**Guiding principle: Never mock what you can use for real.**

LLMs love to mock things, often creating tests that don't test actual code. Bake anti-mocking into every agent's workflow.

Requirements:

- High coverage rate
- 100% pass rate
- Fix failures immediately or scrap the entire run

### 4. Standardization

Prevent chaos across your project:

- **Issue tracking:** All issues in one location
- **Agent learnings:** Store in one place (not 600 scattered markdown files)
- **Work location:** Standardize where agents do their work (work trees)
- **Review process:** Define who reviews agent work (other agents? humans via PR?)

### 5. Per-Agent Isolation

**An isolated agent is a safe agent.**

Critical for swarms and multi-agent workflows. Prevents agents from:

- Overwriting each other's work
- Stepping on each other's toes

**Implementation:** Always run agents within work trees.

### 6. Hard Blocks

Define what agents can **never** do:

**Examples:**

- Block `git push` (require manual verification)
- Scout agents: read-only, no file writes
- Block tools outside agent scope

Tie hard blocks to hooks—implement blocks as code.

---

## Techniques

### 1. Traceability

Track everything:

- What agent made what changes
- When changes were made
- Where changes were made

Hooks enable full traceability of every action.

### 2. Task Decomposition

**A focused agent is a correct agent.**

**Principle:** One agent, one task, one prompt.

- Try to "oneshot" everything
- Give the agent one prompt that carries through to completion
- As success rates increase, trust in agents grows

### 3. Pit of Success

Input tokens = fine-tuning. Garbage in, garbage out.

**Recursive loop:** As agents write higher quality code, new agents working on that code output higher quality code.

Make it easy for agents to do the right thing and hard to do the wrong thing.

### 4. Specs

**Leave no ambiguity.** Agents should never infer intent.

Spec requirements:

- Perfectly aligned with your vision
- As detailed as possible
- Include exact line numbers, file names, code snippets

The more detailed the spec, the better the result.

### 5. Multi-Agent Workflows (Swarms)

Series of agents that:

- Decompose tasks
- Review each other's code
- Write detailed specs
- Build out specs

**Critical:** Every agent must pass quality checks before passing work to the next agent.

Example flow:

1. Build agent finishes work
2. Quality check: tests passing, linting passing, typing passing
3. Review agent receives clean work
4. Continue up the chain to coordinator agent

By the time code hits the coordinator, every step has been quality-checked.

### 6. Agent Scope

Another perspective on "one agent, one task, one prompt."

Define:

- What files should this agent work on?
- What is outside scope?
- How do we reduce ambiguity?

If an agent encounters problems outside its scope, it should leave those for another agent—don't get distracted.

### 7. Standardization (Again)

**Agents should never surprise you.**

Standardize across your codebase:

- Output naming
- Prompt structure
- Tool usage
- Agent access permissions

**Chain of command:** Define when the user needs to be notified. Decision points are vital for preventing slop.

---

## Implementation Notes

This is not a comprehensive list. Work with your team to:

1. Identify available tools in your codebase
2. Define techniques your team should follow
3. Distill these into agent workflows

**Key principle:** Don't just adopt default settings. Thoughtfully design your anti-slop system.

---

## Reference

- Stripe article on using agents in production (mentioned in video)
- Indie Dev Dan: "One agent, one task, one prompt"
