import * as fs from "node:fs/promises";
import * as path from "node:path";
import { exists, findRepoRoot, parseEnv } from "./skill-helpers";

interface Result {
	found: boolean;
	repoRoot: string | null;
	envPath: string | null;
	keyName: string;
	masked: string | null;
	message: string;
	warning: string | null;
	example: string | null;
	getKeyFrom: string | null;
}

const API_DOCS_URL = "https://skillsmp.com/docs/api";
const ENV_EXAMPLE = "SKILLSMP_API_KEY=sk_live_your_real_key_here";

const KEY_NAME = "SKILLSMP_API_KEY";

function mask(value: string): string {
	if (value.length <= 10) return "***";
	return `${value.slice(0, 7)}...${value.slice(-4)}`;
}

async function main(): Promise<void> {
	const repoRoot = await findRepoRoot(process.cwd());
	if (!repoRoot) {
		const result: Result = {
			found: false,
			repoRoot: null,
			envPath: null,
			keyName: KEY_NAME,
			masked: null,
			message: "No repository root found from current working directory.",
			warning: "The SkillsMP API key cannot be resolved until the active repository is known.",
			example: ENV_EXAMPLE,
			getKeyFrom: API_DOCS_URL,
		};
		process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
		return;
	}

	const envPath = path.join(repoRoot, ".omp", ".env");
	if (!(await exists(envPath))) {
		const result: Result = {
			found: false,
			repoRoot,
			envPath,
			keyName: KEY_NAME,
			masked: null,
			message: "No .pi/.env file found in the active repository.",
			warning:
				"SkillsMP API-backed search is unavailable until you create .pi/.env with a valid SKILLSMP_API_KEY.",
			example: ENV_EXAMPLE,
			getKeyFrom: API_DOCS_URL,
		};
		process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
		return;
	}

	const contents = await fs.readFile(envPath, "utf8");
	const values = parseEnv(contents);
	const apiKey = values[KEY_NAME] ?? null;
	const result: Result = {
		found: Boolean(apiKey),
		repoRoot,
		envPath,
		keyName: KEY_NAME,
		masked: apiKey ? mask(apiKey) : null,
		message: apiKey
			? "SkillsMP API key loaded from .pi/.env."
			: "No SkillsMP API key found in .pi/.env.",
		warning: apiKey
			? null
			: "SkillsMP API-backed search is unavailable until you add SKILLSMP_API_KEY to .pi/.env.",
		example: apiKey ? null : ENV_EXAMPLE,
		getKeyFrom: apiKey ? null : API_DOCS_URL,
	};
	process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

await main();
