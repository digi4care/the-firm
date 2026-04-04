import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Check if a path exists
 */
export async function exists(targetPath: string): Promise<boolean> {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Find repository root by looking for .git directory
 */
export async function findRepoRoot(startDir: string): Promise<string | null> {
	let current = path.resolve(startDir);
	while (true) {
		if (await exists(path.join(current, ".git"))) return current;
		const parent = path.dirname(current);
		if (parent === current) return null;
		current = parent;
	}
}

/**
 * Extract a value from YAML frontmatter, handling:
 * - Single-line values: `key: value`
 * - Quoted values: `key: "value"` or `key: 'value'`
 * - Folded multiline (>): `key: >\n  line1\n  line2`
 * - Literal multiline (|): `key: |\n  line1\n  line2`
 *
 * Returns null if key not found or frontmatter is invalid
 */
export function extractFrontmatterValue(markdown: string, key: string): string | null {
	const frontmatterMatch = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
	if (!frontmatterMatch) return null;

	const frontmatter = frontmatterMatch[1];
	const lines = frontmatter.split(/\r?\n/);

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const keyMatch = line.match(new RegExp(`^${key}:\\s*(.*)$`));
		if (!keyMatch) continue;

		const value = keyMatch[1].trim();

		// Handle explicit multiline indicators (> or |)
		if (value === ">" || value === "|") {
			const valueLines: string[] = [];
			for (let j = i + 1; j < lines.length; j++) {
				const nextLine = lines[j];
				// Stop at next top-level key or end of frontmatter section (empty line or ---)
				if (nextLine.match(/^[a-zA-Z_-]+:/) || nextLine.trim() === "---") break;
				// Only add indented lines (part of the multiline value)
				if (nextLine.startsWith(" ") || nextLine.startsWith("\t")) {
					valueLines.push(nextLine.replace(/^[\s]+/, ""));
				} else if (nextLine.trim() === "") {
					// Empty line within folded scalar: becomes a space for >
					valueLines.push("");
				}
			}
			// Join folded lines with space (YAML > behavior)
			return valueLines.join(" ").trim().replace(/\s+/g, " ");
		}

		// Handle inline values (possibly quoted)
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			return value.slice(1, -1);
		}

		// Check if this is an implicit folded multiline (value starts on next line)
		if (value === "" && i + 1 < lines.length) {
			const nextLine = lines[i + 1];
			if (nextLine.startsWith(" ") || nextLine.startsWith("\t")) {
				const valueLines: string[] = [];
				for (let j = i + 1; j < lines.length; j++) {
					const inlineNextLine = lines[j];
					if (inlineNextLine.match(/^[a-zA-Z_-]+:/) || inlineNextLine.trim() === "---") break;
					if (inlineNextLine.startsWith(" ") || inlineNextLine.startsWith("\t")) {
						valueLines.push(inlineNextLine.replace(/^[\s]+/, ""));
					}
				}
				return valueLines.join(" ").trim().replace(/\s+/g, " ");
			}
		}

		return value;
	}

	return null;
}

/**
 * Parse simple KEY=value .env file format
 */
export function parseEnv(contents: string): Record<string, string> {
	const result: Record<string, string> = {};
	for (const rawLine of contents.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq <= 0) continue;
		const key = line.slice(0, eq).trim();
		let value = line.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		result[key] = value;
	}
	return result;
}

/**
 * Interface for a skill candidate
 */
export interface SkillCandidate {
	zipPath: string;
	folderName: string;
	skillName: string | null;
	description: string | null;
	statsJsonPresent: boolean;
	skillMdPath: string | null;
	descriptionEnPath: string | null;
	recommendedNextStep: string;
	rawFrontmatter?: string | null;
}

/**
 * Interface for synthesis group
 */
export interface SynthesisGroup {
	skillIds: string[];
	commonCapability: string;
	reason: string;
}

/**
 * Interface for the adoption plan
 */
export interface AdoptionPlan {
	repoRoot: string;
	envStatus: {
		envFileExists: boolean;
		apiKeyPresent: boolean;
		apiKeyMasked: string | null;
		message: string;
	};
	localSkills: string[];
	downloadedCandidates: SkillCandidate[];
	recommendedActions: {
		canSearchExternally: boolean;
		auditRequired: string[];
		optimizeRequired: string[];
		synthesisOpportunities: SynthesisGroup[];
	};
	plan: {
		step: number;
		action: string;
		target: string;
		reason: string;
	}[];
}

/**
 * Group candidates by semantic similarity for synthesis opportunities
 */
export function findSynthesisOpportunities(candidates: SkillCandidate[]): SynthesisGroup[] {
	const groups: SynthesisGroup[] = [];
	const processed = new Set<string>();

	// Helper to extract capability keywords from description
	function extractCapabilities(candidate: SkillCandidate): Set<string> {
		const caps = new Set<string>();
		const text = (candidate.skillName + " " + candidate.description).toLowerCase();

		const patterns: [RegExp, string][] = [
			[/\bskill\s+(?:finder|discovery|search|recommend)/, "skill-discovery"],
			[/\bsearch\s+(?:skill|api|tool)/, "skill-search"],
			[/api\s+(?:search|skill|discovery)/, "api-skill-search"],
			[/\b(?:find|discover|recommend)\s+(?:skill|tool)/, "skill-discovery"],
			[/\bskillsmp\b/, "skillsmp-integration"],
		];

		for (const [pattern, cap] of patterns) {
			if (pattern.test(text)) caps.add(cap);
		}

		return caps;
	}

	// Group by shared capabilities
	for (const candidate of candidates) {
		if (candidate.skillMdPath === null) continue;
		const id = candidate.folderName;
		if (processed.has(id)) continue;

		const caps = extractCapabilities(candidate);
		if (caps.size === 0) continue;

		const similar: string[] = [id];
		processed.add(id);

		for (const other of candidates) {
			if (other.skillMdPath === null) continue;
			const otherId = other.folderName;
			if (processed.has(otherId)) continue;

			const otherCaps = extractCapabilities(other);
			// Check for significant overlap
			let overlap = 0;
			for (const cap of caps) {
				if (otherCaps.has(cap)) overlap++;
			}

			// Synthesis candidate if shares 2+ capabilities or is the same type
			if (overlap >= 1) {
				similar.push(otherId);
				processed.add(otherId);
			}
		}

		if (similar.length > 1) {
			// Determine common capability name
			const commonCaps = Array.from(
				extractCapabilities(candidates.find((c) => c.folderName === similar[0])!),
			);
			groups.push({
				skillIds: similar,
				commonCapability: commonCaps[0] || "overlapping-capability",
				reason: `Share common functionality: ${commonCaps.join(", ")}`,
			});
		}
	}

	return groups;
}

/**
 * Generate a machine-readable adoption plan
 */
export async function generateAdoptionPlan(
	repoRoot: string,
	envStatus: {
		envFileExists: boolean;
		apiKeyPresent: boolean;
		apiKeyMasked: string | null;
		message: string;
	},
	localSkills: string[],
	downloadedCandidates: SkillCandidate[],
): Promise<AdoptionPlan> {
	const validCandidates = downloadedCandidates.filter((c) => c.skillMdPath !== null);
	const candidatesNeedingAudit = validCandidates.map((c) => c.folderName);
	const candidatesNeedingOptimize = validCandidates.map((c) => c.folderName);

	const synthesisOpportunities = findSynthesisOpportunities(downloadedCandidates);

	// Build step-by-step plan
	const plan: AdoptionPlan["plan"] = [];
	let stepNum = 1;

	// Step 1: Check local skills
	plan.push({
		step: stepNum++,
		action: localSkills.length > 0 ? "review" : "skip",
		target: "local-skills",
		reason:
			localSkills.length > 0
				? `${localSkills.length} local skill(s) available - prefer if capability already exists`
				: "No local skills to review",
	});

	// Step 2: External search readiness
	plan.push({
		step: stepNum++,
		action: envStatus.apiKeyPresent ? "ready" : "configure",
		target: "external-search",
		reason: envStatus.apiKeyPresent
			? "SkillsMP API key configured - API-backed search is available"
			: "Add SKILLSMP_API_KEY to .pi/.env for API-backed search, or continue with documented fallback sources",
	});

	// Step 3: Inspect downloaded candidates
	plan.push({
		step: stepNum++,
		action: downloadedCandidates.length > 0 ? "inspect" : "skip",
		target: "downloaded-candidates",
		reason:
			downloadedCandidates.length > 0
				? `${downloadedCandidates.length} candidate(s) in downloads/ directory`
				: "No downloaded candidates to inspect",
	});

	// Step 4: Audit gate
	if (candidatesNeedingAudit.length > 0) {
		plan.push({
			step: stepNum++,
			action: "audit",
			target: candidatesNeedingAudit.join(", "),
			reason: "All downloaded skills must pass audit before adoption",
		});
	}

	// Step 5: Optimization gate
	if (candidatesNeedingOptimize.length > 0) {
		plan.push({
			step: stepNum++,
			action: "optimize",
			target: candidatesNeedingOptimize.join(", "),
			reason: "Optimize through skill-creator workflow before adoption",
		});
	}

	// Step 6: Synthesis consideration
	if (synthesisOpportunities.length > 0) {
		for (const group of synthesisOpportunities) {
			plan.push({
				step: stepNum++,
				action: "consider-synthesis",
				target: group.skillIds.join(" + "),
				reason: `Instead of adopting multiple overlapping skills, synthesize one optimized repo-local skill: ${group.reason}`,
			});
		}
	}

	return {
		repoRoot,
		envStatus,
		localSkills,
		downloadedCandidates,
		recommendedActions: {
			canSearchExternally: envStatus.apiKeyPresent,
			auditRequired: candidatesNeedingAudit,
			optimizeRequired: candidatesNeedingOptimize,
			synthesisOpportunities,
		},
		plan,
	};
}
