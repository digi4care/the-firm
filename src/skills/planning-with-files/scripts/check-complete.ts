#!/usr/bin/env tsx
/**
 * Check if all phases in task_plan.md are complete (TypeScript version)
 *
 * Usage:
 *   Standalone: npx tsx check-complete.ts [task_plan.md]
 *   From hook:  import { checkComplete } from './check-complete'
 *
 * @version 2.1.0
 * @requires oh-my-pi >= 0.31.0
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface CompletionStatus {
	total: number;
	complete: number;
	inProgress: number;
	pending: number;
	allComplete: boolean;
	message: string;
}

export function checkComplete(
	planFile: string = "task_plan.md",
	cwd: string = process.cwd(),
): CompletionStatus {
	const planPath = join(cwd, planFile);

	if (!existsSync(planPath)) {
		const message = "[planning-with-files] No task_plan.md found — no active planning session.";
		console.log(message);
		return {
			total: 0,
			complete: 0,
			inProgress: 0,
			pending: 0,
			allComplete: false,
			message,
		};
	}

	const content = readFileSync(planPath, "utf-8");

	const total = (content.match(/### Phase/g) || []).length;

	let complete = (content.match(/\*\*Status:\*\* complete/g) || []).length;
	let inProgress = (content.match(/\*\*Status:\*\* in_progress/g) || []).length;
	let pending = (content.match(/\*\*Status:\*\* pending/g) || []).length;

	if (complete === 0 && inProgress === 0 && pending === 0) {
		complete = (content.match(/\[complete\]/g) || []).length;
		inProgress = (content.match(/\[in_progress\]/g) || []).length;
		pending = (content.match(/\[pending\]/g) || []).length;
	}

	let message: string;
	const allComplete = complete === total && total > 0;

	if (allComplete) {
		message = `[planning-with-files] ALL PHASES COMPLETE (${complete}/${total})`;
		console.log(message);
	} else {
		message = `[planning-with-files] Task in progress (${complete}/${total} phases complete)`;
		console.log(message);
		if (inProgress > 0) {
			console.log(`[planning-with-files] ${inProgress} phase(s) still in progress.`);
		}
		if (pending > 0) {
			console.log(`[planning-with-files] ${pending} phase(s) pending.`);
		}
	}

	return { total, complete, inProgress, pending, allComplete, message };
}

function main(): void {
	const planFile = process.argv[2] || "task_plan.md";
	checkComplete(planFile, process.cwd());
}

if (require.main === module) {
	main();
}

export default checkComplete;
