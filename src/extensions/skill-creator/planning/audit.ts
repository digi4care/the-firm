/**
 * Audit functionality for skill quality assessment
 */

import {
	getSectionBody,
	parseListItems,
	parseQuickTestsBody,
	parseReferenceItems,
	parseWhenToUseBody,
} from "../markdown/parsers.js";
import type { AuditResult, QualityMetrics, Tests } from "../types.js";
import { countWords, escapeRegExp } from "../utils/strings.js";

const hasSection = (content: string, title: string): boolean => {
	const pattern = new RegExp(`(^|\\n)##\\s+${escapeRegExp(title)}\\b`, "i");
	return pattern.test(content);
};

export const collectQualityMetrics = (content: string): QualityMetrics => {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
	const frontmatter = frontmatterMatch ? frontmatterMatch[1] : "";
	const descriptionLine =
		frontmatter
			.split("\n")
			.find((line) => line.startsWith("description:"))
			?.replace(/^description:\s*/, "") ?? "";
	const descriptionWordCount = countWords(descriptionLine || "");
	const descriptionHasUseWhen = /use when/i.test(descriptionLine);
	const descriptionHasNegative = /do not trigger|do not use/i.test(descriptionLine);

	const whenToUseBody =
		getSectionBody(content, "When to Use Me") ?? getSectionBody(content, "When to Use");
	const workflowBody = getSectionBody(content, "Workflow");
	const errorBody = getSectionBody(content, "Error Handling");
	const testsBody = getSectionBody(content, "Quick Tests");
	const referencesBody = getSectionBody(content, "References");

	const whenToUse = whenToUseBody ? parseWhenToUseBody(whenToUseBody) : { use: [], avoid: [] };
	const workflow = workflowBody ? parseListItems(workflowBody) : [];
	const errors = errorBody ? parseListItems(errorBody) : [];
	const tests: Tests = testsBody
		? parseQuickTestsBody(testsBody)
		: { shouldTrigger: [], shouldNotTrigger: [], functional: [] };
	const references = referencesBody ? parseReferenceItems(referencesBody) : [];

	const hasWhenToUse = !!whenToUseBody;
	const hasWorkflow = !!workflowBody;
	const hasErrorHandling = !!errorBody;
	const hasQuickTests = !!testsBody;
	const hasReferences = !!referencesBody;

	const testCount =
		tests.shouldTrigger.length + tests.shouldNotTrigger.length + tests.functional.length;

	// Score calculation
	const score =
		(descriptionHasUseWhen ? 6 : 0) +
		(descriptionHasNegative ? 6 : 0) +
		Math.min(Math.floor(descriptionWordCount / 8), 5) +
		(hasWhenToUse ? 10 : 0) +
		(hasWorkflow ? 10 : 0) +
		(hasErrorHandling ? 10 : 0) +
		(hasQuickTests ? 10 : 0) +
		(hasReferences ? 10 : 0) +
		Math.min(whenToUse.use.length + whenToUse.avoid.length, 10) +
		Math.min(workflow.length, 8) * 2 +
		Math.min(errors.length, 6) * 2 +
		Math.min(testCount, 9) * 2 +
		Math.min(references.length, 10);

	return {
		score,
		wordCount: countWords(content),
		descriptionWordCount,
		descriptionHasUseWhen,
		descriptionHasNegative,
		hasWhenToUse,
		hasErrorHandling,
		hasQuickTests,
		hasReferences,
		hasWorkflow,
		useCount: whenToUse.use.length,
		avoidCount: whenToUse.avoid.length,
		workflowCount: workflow.length,
		errorCount: errors.length,
		testCount,
		referenceCount: references.length,
	};
};

export const auditSkill = (args: {
	skillContent: string;
	description?: string;
	maxWords?: number;
}): AuditResult => {
	const maxWords = args.maxWords ?? 2000;
	const combined = [args.description ?? "", args.skillContent].join("\n");
	const wordCount = countWords(args.skillContent);
	const checks = {
		hasWhenToUse:
			hasSection(args.skillContent, "When to Use Me") ||
			hasSection(args.skillContent, "When to Use"),
		hasNegativeTriggers: /do not use|should not trigger|do not trigger/i.test(combined),
		hasErrorHandling: hasSection(args.skillContent, "Error Handling"),
		hasQuickTests: hasSection(args.skillContent, "Quick Tests"),
		hasReferences: hasSection(args.skillContent, "References"),
		withinWordLimit: wordCount <= maxWords,
	};

	const warnings: string[] = [];
	if (!checks.withinWordLimit) {
		warnings.push(`Word count ${wordCount} exceeds ${maxWords}.`);
	}

	const missing = Object.entries(checks)
		.filter(([key, value]) => !value && key !== "withinWordLimit")
		.map(([key]) => key);

	return {
		wordCount,
		maxWords,
		checks,
		missing,
		warnings,
	};
};
