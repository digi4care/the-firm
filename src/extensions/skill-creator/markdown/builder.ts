/**
 * Markdown builder for complete SKILL.md files
 */

import type { Tests } from "../types.js";
import { toTitleCase } from "../utils/strings.js";
import {
	buildErrorHandlingBody,
	buildQuickTestsBody,
	buildReferencesBody,
	buildWhenToUseBody,
	buildWorkflowBody,
} from "./sections.js";

export interface SkillMarkdownInput {
	name: string;
	description: string;
	author: string;
	version: string;
	license: string;
	triggers: string[];
	negativeTriggers: string[];
	workflow: string[];
	errorHandling: string[];
	tests: Tests;
	references: string[];
}

export const buildSkillMarkdown = (input: SkillMarkdownInput): string => {
	const frontmatter = [
		"---",
		`name: ${input.name}`,
		`description: ${input.description}`,
		`license: ${input.license}`,
		"---",
	].join("\n");

	return [
		frontmatter,
		"",
		`# ${toTitleCase(input.name)}`,
		"",
		"## When to Use Me",
		"",
		buildWhenToUseBody(input.triggers, input.negativeTriggers),
		"",
		"## Workflow",
		"",
		buildWorkflowBody(input.workflow),
		"",
		"## Error Handling",
		"",
		buildErrorHandlingBody(input.errorHandling),
		"",
		"## Quick Tests",
		"",
		buildQuickTestsBody(input.tests),
		"",
		"## References",
		"",
		buildReferencesBody(input.references),
		"",
	].join("\n");
};

export const buildReferenceStub = (filename: string): string => {
	const title = toTitleCase(filename.replace(/\.mdx?$/i, ""));
	return `# ${title}\n\n<add content here>\n`;
};
