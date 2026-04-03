#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const VALID_BUMP_TYPES = ["patch", "minor", "major"];

function getUsage() {
	return `Usage: bun scripts/version-bump.js <patch|minor|major>`;
}

function parseArgs() {
	const bumpType = process.argv[2];

	if (!bumpType) {
		console.error("Error: Geen bump type opgegeven.");
		console.error(getUsage());
		process.exit(1);
	}

	if (!VALID_BUMP_TYPES.includes(bumpType)) {
		console.error(`Error: Ongeldig bump type '${bumpType}'.`);
		console.error(`Geldige opties: ${VALID_BUMP_TYPES.join(", ")}`);
		console.error(getUsage());
		process.exit(1);
	}

	return bumpType;
}

function checkGitRepo() {
	try {
		execSync("git rev-parse --git-dir", { stdio: "pipe" });
	} catch {
		console.error("Error: Geen git repository gevonden.");
		process.exit(1);
	}
}

function isGitClean() {
	try {
		const status = execSync("git status --porcelain", {
			encoding: "utf-8",
			stdio: "pipe",
		});
		return status.trim() === "";
	} catch {
		return false;
	}
}

function bumpVersion(version, bumpType) {
	const parts = version.split(".").map(Number);

	if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
		throw new Error(`Ongeldig versienummer formaat: ${version}`);
	}

	const [major, minor, patch] = parts;

	switch (bumpType) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
		default:
			throw new Error(`Onbekend bump type: ${bumpType}`);
	}
}

function getTodayDate() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function main() {
	const bumpType = parseArgs();
	checkGitRepo();

	const rootDir = process.cwd();
	const packageJsonPath = join(rootDir, "package.json");
	const changelogPath = join(rootDir, "CHANGELOG.md");

	if (!existsSync(packageJsonPath)) {
		console.error(`Error: package.json niet gevonden op ${packageJsonPath}`);
		process.exit(1);
	}

	if (!existsSync(changelogPath)) {
		console.error(`Error: CHANGELOG.md niet gevonden op ${changelogPath}`);
		process.exit(1);
	}

	if (!isGitClean()) {
		console.warn("Waarschuwing: Git working directory is niet clean.");
		console.warn("Doorgaan met bump...");
	}

	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
	const currentVersion = packageJson.version;

	if (!currentVersion) {
		console.error("Error: Geen versienummer gevonden in package.json");
		process.exit(1);
	}

	const newVersion = bumpVersion(currentVersion, bumpType);

	packageJson.version = newVersion;
	writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
	console.log(`package.json bijgewerkt: ${currentVersion} -> ${newVersion}`);

	const changelog = readFileSync(changelogPath, "utf-8");
	const today = getTodayDate();
	const newEntry = `## [${newVersion}] - ${today}

### Toegevoegd
- (nog in te vullen)

`;

	const existingHeader = "## [0.1.0]";
	const updatedChangelog = changelog.replace(existingHeader, newEntry + existingHeader);
	writeFileSync(changelogPath, updatedChangelog);
	console.log(`CHANGELOG.md bijgewerkt met entry voor ${newVersion}`);

	execSync("git add package.json CHANGELOG.md", { stdio: "inherit" });
	console.log("Staged package.json en CHANGELOG.md");

	const commitMessage = `chore: bump versie naar ${newVersion}`;
	execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });
	console.log(`Commit gemaakt: ${commitMessage}`);

	execSync(`git tag v${newVersion}`, { stdio: "inherit" });
	console.log(`Tag aangemaakt: v${newVersion}`);

	console.log(`\nVersie bump naar ${newVersion} succesvol afgerond.`);
}

main();
