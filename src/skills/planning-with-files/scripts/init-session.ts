#!/usr/bin/env tsx
/**
 * Initialize planning files for a new session (TypeScript version)
 *
 * Usage:
 *   Standalone: npx tsx init-session.ts [project-name]
 *   From hook:  import { initSession } from './init-session'
 *
 * @version 2.1.0
 * @requires oh-my-pi >= 0.31.0
 */

import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TASK_PLAN_TEMPLATE = `# Task Plan: [Brief Description]

## Goal
[One sentence describing the end state]

## Current Phase
Phase 1

## Phases

### Phase 1: Requirements & Discovery
- [ ] Understand user intent
- [ ] Identify constraints
- [ ] Document in findings.md
- **Status:** in_progress

### Phase 2: Planning & Structure
- [ ] Define approach
- [ ] Create project structure
- **Status:** pending

### Phase 3: Implementation
- [ ] Execute the plan
- [ ] Write to files before executing
- **Status:** pending

### Phase 4: Testing & Verification
- [ ] Verify requirements met
- [ ] Document test results
- **Status:** pending

### Phase 5: Delivery
- [ ] Review outputs
- [ ] Deliver to user
- **Status:** pending

## Decisions Made
| Decision | Rationale |
|----------|-----------|

## Errors Encountered
| Error | Resolution |
|-------|------------|
`;

const FINDINGS_TEMPLATE = `# Findings & Decisions

## Requirements
-

## Research Findings
-

## Technical Decisions
| Decision | Rationale |
|----------|-----------|

## Issues Encountered
| Issue | Resolution |
|-------|------------|

## Resources
-
`;

function getProgressTemplate(date: string): string {
	return `# Progress Log

## Session: ${date}

### Current Status
- **Phase:** 1 - Requirements & Discovery
- **Started:** ${date}

### Actions Taken
-

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|

### Errors
| Error | Resolution |
|-------|------------|
`;
}

interface InitResult {
	created: string[];
	skipped: string[];
	success: boolean;
}

export function initSession(
	projectName: string = "project",
	cwd: string = process.cwd(),
): InitResult {
	const date = new Date().toISOString().split("T")[0];
	const created: string[] = [];
	const skipped: string[] = [];

	console.log(`Initializing planning files for: ${projectName}`);

	const taskPlanPath = join(cwd, "task_plan.md");
	if (!existsSync(taskPlanPath)) {
		writeFileSync(taskPlanPath, TASK_PLAN_TEMPLATE);
		created.push("task_plan.md");
		console.log("Created task_plan.md");
	} else {
		skipped.push("task_plan.md");
		console.log("task_plan.md already exists, skipping");
	}

	const findingsPath = join(cwd, "findings.md");
	if (!existsSync(findingsPath)) {
		writeFileSync(findingsPath, FINDINGS_TEMPLATE);
		created.push("findings.md");
		console.log("Created findings.md");
	} else {
		skipped.push("findings.md");
		console.log("findings.md already exists, skipping");
	}

	const progressPath = join(cwd, "progress.md");
	if (!existsSync(progressPath)) {
		writeFileSync(progressPath, getProgressTemplate(date));
		created.push("progress.md");
		console.log("Created progress.md");
	} else {
		skipped.push("progress.md");
		console.log("progress.md already exists, skipping");
	}

	console.log("");
	console.log("Planning files initialized!");
	console.log(`Files: ${[...created, ...skipped].join(", ")}`);
	console.log("");
	console.log("Next steps:");
	console.log("1. Edit task_plan.md with your specific goal");
	console.log("2. Update phase statuses as you progress");
	console.log("3. Log findings in findings.md");
	console.log("4. Track progress in progress.md");

	return { created, skipped, success: true };
}

function main(): void {
	const projectName = process.argv[2] || "project";
	initSession(projectName, process.cwd());
}

if (require.main === module) {
	main();
}

export default initSession;
