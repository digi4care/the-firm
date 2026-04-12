#!/usr/bin/env node
/**
 * Release script for The Firm.
 *
 * Usage: node scripts/release.mjs <major|minor|patch>
 *
 * Rules:
 * - Run releases from the production branch only.
 * - Stage explicit files only (never git add .).
 * - Publish the workspace after the release commit and tag are created.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BUMP_TYPE = process.argv[2];

if (!["major", "minor", "patch"].includes(BUMP_TYPE)) {
	console.error("Usage: node scripts/release.mjs <major|minor|patch>");
	process.exit(1);
}

function run(cmd, options = {}) {
	console.log(`$ ${cmd}`);
	try {
		return execSync(cmd, { encoding: "utf-8", stdio: options.silent ? "pipe" : "inherit", ...options });
	} catch (error) {
		if (!options.ignoreError) {
			console.error(`Command failed: ${cmd}`);
			process.exit(1);
		}
		return null;
	}
}

function getCurrentBranch() {
	return run("git branch --show-current", { silent: true })?.trim() ?? "";
}

function getRootVersion() {
	const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
	return pkg.version;
}

function getPackageJsonPaths() {
	const packagesDir = "packages";
	const packages = readdirSync(packagesDir);
	return packages
		.map((pkg) => join(packagesDir, pkg, "package.json"))
		.filter((path) => existsSync(path));
}

function getChangelogPaths() {
	const packagesDir = "packages";
	const packages = readdirSync(packagesDir);
	return packages
		.map((pkg) => join(packagesDir, pkg, "CHANGELOG.md"))
		.filter((path) => existsSync(path));
}

function stagePaths(paths) {
	if (paths.length === 0) return;
	const quoted = paths.map((path) => JSON.stringify(path)).join(" ");
	run(`git add -- ${quoted}`);
}

function updateChangelogsForRelease(version) {
	const date = new Date().toISOString().split("T")[0];
	const changelogs = getChangelogPaths();

	for (const changelog of changelogs) {
		const content = readFileSync(changelog, "utf-8");

		if (!content.includes("## [Unreleased]")) {
			console.log(`  Skipping ${changelog}: no [Unreleased] section`);
			continue;
		}

		const updated = content.replace("## [Unreleased]", `## [${version}] - ${date}`);
		writeFileSync(changelog, updated);
		console.log(`  Updated ${changelog}`);
	}
}

function addUnreleasedSection() {
	const changelogs = getChangelogPaths();
	const unreleasedSection = "## [Unreleased]\n\n";

	for (const changelog of changelogs) {
		const content = readFileSync(changelog, "utf-8");
		const updated = content.replace(/^(# Changelog\n\n)/, `$1${unreleasedSection}`);
		writeFileSync(changelog, updated);
		console.log(`  Added [Unreleased] to ${changelog}`);
	}
}

console.log("\n=== The Firm Release Script ===\n");

console.log("Checking branch...");
const branch = getCurrentBranch();
if (branch !== "production") {
	console.error(`Error: releases must run from the production branch. Current branch: ${branch || "(unknown)"}`);
	process.exit(1);
}
console.log("  On production branch\n");

console.log("Checking for uncommitted changes...");
const status = run("git status --porcelain", { silent: true });
if (status && status.trim()) {
	console.error("Error: uncommitted changes detected. Commit or stash first.");
	console.error(status);
	process.exit(1);
}
console.log("  Working directory clean\n");

console.log(`Bumping version (${BUMP_TYPE})...`);
run(`npm run version:${BUMP_TYPE}`);
const version = getRootVersion();
console.log(`  New version: ${version}\n`);

console.log("Updating CHANGELOG.md files...");
updateChangelogsForRelease(version);
console.log();

console.log("Creating release commit and tag...");
stagePaths(["package.json", "package-lock.json", ...getPackageJsonPaths(), ...getChangelogPaths()]);
run(`git commit -m "release: v${version}"`);
run(`git tag v${version}`);
console.log();

console.log("Publishing workspace to npm...");
run("npm run publish");
console.log();

console.log("Adding fresh [Unreleased] sections...");
addUnreleasedSection();
console.log();

console.log("Creating post-release changelog commit...");
stagePaths(getChangelogPaths());
run('git commit -m "docs: open next unreleased changelog cycle"');
console.log();

console.log("Pushing production branch and tag...");
run("git push origin production");
run(`git push origin v${version}`);
console.log();

console.log(`=== Released The Firm v${version} ===`);
