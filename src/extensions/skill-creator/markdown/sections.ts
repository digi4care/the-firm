/**
 * Markdown section builders for skill-creator
 */

import type { Tests } from "../types.js";
import { formatBulletList, formatNumberedList } from "../utils/formatters.js";

export const buildWhenToUseBody = (triggers: string[], negatives: string[]): string => {
	const triggerLines = formatBulletList(triggers, "<add trigger phrases>");
	const negativeLines = formatBulletList(negatives, "<add negative triggers>");
	return `Use me when:\n\n${triggerLines}\n\nDo not use me for:\n\n${negativeLines}`;
};

export const buildWorkflowBody = (workflow: string[]): string =>
	formatNumberedList(workflow, "<add workflow steps>");

export const buildErrorHandlingBody = (errors: string[]): string =>
	formatBulletList(errors, "<add error handling steps>");

export const buildQuickTestsBody = (tests: Tests): string => {
	const shouldTrigger = formatBulletList(tests.shouldTrigger, "<add should-trigger prompt>");
	const shouldNotTrigger = formatBulletList(
		tests.shouldNotTrigger,
		"<add should-not-trigger prompt>",
	);
	const functional = formatBulletList(tests.functional, "<add functional test prompt>");

	return [
		"Should trigger:",
		"",
		shouldTrigger,
		"",
		"Should not trigger:",
		"",
		shouldNotTrigger,
		"",
		"Functional:",
		"",
		functional,
	].join("\n");
};

export const buildReferencesBody = (references: string[]): string =>
	formatBulletList(
		references.map((ref) => `\`references/${ref}\``),
		"<add reference files>",
	);
