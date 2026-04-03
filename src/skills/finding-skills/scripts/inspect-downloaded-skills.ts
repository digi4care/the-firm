import * as fs from "node:fs/promises";
import * as path from "node:path";
import { $ } from "bun";
import {
	exists,
	findRepoRoot,
	extractFrontmatterValue,
	parseEnv,
	generateAdoptionPlan,
	type SkillCandidate,
} from "./skill-helpers";

async function listZipEntries(zipPath: string): Promise<string[]> {
	const result = await $`unzip -Z1 ${zipPath}`.quiet().nothrow();
	if (result.exitCode !== 0) throw new Error(`Failed to list ZIP entries for ${zipPath}`);
	return result
		.text()
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

async function unzipFileToText(zipPath: string, entryPath: string): Promise<string | null> {
	const result = await $`unzip -p ${zipPath} ${entryPath}`.quiet().nothrow();
	if (result.exitCode !== 0) return null;
	return result.text();
}

async function inspectZip(zipPath: string): Promise<SkillCandidate> {
	const entries = await listZipEntries(zipPath);
	const skillMdPath = entries.find((entry) => /\/SKILL\.md$/i.test(entry)) ?? null;
	const descriptionEnPath = entries.find((entry) => /description_en\.txt$/i.test(entry)) ?? null;
	const statsJsonPresent = entries.some((entry) => /stats\.json$/i.test(entry));
	const folderName = entries[0]?.split("/")[0] ?? path.basename(zipPath, ".zip");

	let skillName: string | null = null;
	let description: string | null = null;

	if (skillMdPath) {
		const skillMd = await unzipFileToText(zipPath, skillMdPath);
		if (skillMd) {
			skillName = extractFrontmatterValue(skillMd, "name");
			description = extractFrontmatterValue(skillMd, "description");
		}
	}

	if (!description && descriptionEnPath) {
		description = await unzipFileToText(zipPath, descriptionEnPath);
		description = description?.trim() ?? null;
	}

	return {
		zipPath,
		folderName,
		skillName,
		description,
		statsJsonPresent,
		skillMdPath,
		descriptionEnPath,
		recommendedNextStep: skillMdPath
			? "Extract, audit, and optimize before adoption."
			: "Ignore or inspect manually; no SKILL.md found.",
	};
}

async function listLocalSkills(skillsDir: string): Promise<string[]> {
	if (!(await exists(skillsDir))) return [];
	const entries = await fs.readdir(skillsDir, { withFileTypes: true });
	const result: string[] = [];
	for (const e of entries) {
		if (e.isDirectory()) {
			const skillMdPath = path.join(skillsDir, e.name, "SKILL.md");
			if (await exists(skillMdPath)) {
				result.push(e.name);
			}
		}
	}
	return result;
}

async function main(): Promise<void> {
	const repoRoot = await findRepoRoot(process.cwd());
	if (!repoRoot) throw new Error("No repository root found from current working directory.");

	const downloadsDir = path.join(repoRoot, "downloads");
	const skillsDir = path.join(repoRoot, ".omp", "skills");
	const envPath = path.join(repoRoot, ".omp", ".env");

	// Check environment status
	const envFileExists = await exists(envPath);
	let apiKeyPresent = false;
	let apiKeyMasked: string | null = null;
	if (envFileExists) {
		const contents = await fs.readFile(envPath, "utf8");
		const values = parseEnv(contents);
		const apiKey = values.SKILLSMP_API_KEY ?? null;
		apiKeyPresent = Boolean(apiKey);
		if (apiKey) {
			apiKeyMasked = apiKey.length <= 10 ? "***" : `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
		}
	}

	const envStatus = {
		envFileExists,
		apiKeyPresent,
		apiKeyMasked,
		message: apiKeyPresent
			? "SkillsMP API key configured."
			: envFileExists
				? "No SKILLSMP_API_KEY found in .pi/.env"
				: "No .pi/.env file found. Create one with SKILLSMP_API_KEY=...",
	};

	// List local skills
	const localSkills = await listLocalSkills(skillsDir);

	// Inspect downloaded candidates
	let downloadedCandidates: SkillCandidate[] = [];
	if (await exists(downloadsDir)) {
		const entries = await fs.readdir(downloadsDir);
		const zipFiles = entries.filter((entry) => entry.toLowerCase().endsWith(".zip")).sort();
		downloadedCandidates = await Promise.all(
			zipFiles.map((name) => inspectZip(path.join(downloadsDir, name))),
		);
	}

	// Generate adoption plan
	const plan = await generateAdoptionPlan(repoRoot, envStatus, localSkills, downloadedCandidates);

	process.stdout.write(
		`${JSON.stringify(
			{
				repoRoot,
				downloadsDir,
				zipFiles: downloadedCandidates.map((c) => path.basename(c.zipPath)),
				candidates: downloadedCandidates,
				localSkills,
				envStatus,
				plan,
				message: downloadedCandidates.length
					? "Downloaded skill candidates inspected."
					: "No ZIP skill candidates found.",
			},
			null,
			2,
		)}\n`,
	);
}

await main();
