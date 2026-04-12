import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.resolve(__dirname, "../../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as { version?: string };
const packageVersion = packageJson.version ?? "0.0.0";
const DEVICE_ID_FILENAME = "kimi-device-id";

function getAgentDir(): string {
	const envDir = process.env.FIRM_CODING_AGENT_DIR;
	if (envDir) {
		if (envDir === "~") return os.homedir();
		if (envDir.startsWith("~/")) return os.homedir() + envDir.slice(1);
		return envDir;
	}
	return path.join(os.homedir(), ".the-firm", "agent");
}

function formatDeviceModel(system: string, release: string, arch: string): string {
	return [system, release, arch].filter(Boolean).join(" ").trim();
}

function getDeviceModel(): string {
	const platform = os.platform();
	const release = os.release();
	const arch = os.arch();
	if (platform === "darwin") return formatDeviceModel("macOS", release, arch);
	if (platform === "win32") return formatDeviceModel("Windows", release, arch);
	return formatDeviceModel(platform === "linux" ? "Linux" : platform, release, arch);
}

async function getDeviceId(): Promise<string> {
	const agentDir = getAgentDir();
	const deviceIdPath = path.join(agentDir, DEVICE_ID_FILENAME);
	try {
		const existing = await fs.readFile(deviceIdPath, "utf-8");
		const trimmed = existing.trim();
		if (trimmed) return trimmed;
	} catch {
		// Fall through to create a new device id.
	}

	const deviceId = crypto.randomUUID().replace(/-/g, "");
	await fs.mkdir(agentDir, { recursive: true });
	await fs.writeFile(deviceIdPath, `${deviceId}\n`, { mode: 0o600 });
	await fs.chmod(deviceIdPath, 0o600).catch(() => undefined);
	return deviceId;
}

export async function getKimiCommonHeaders(): Promise<Record<string, string>> {
	return {
		"User-Agent": `KimiCLI/${packageVersion}`,
		"X-Msh-Platform": "kimi_cli",
		"X-Msh-Version": packageVersion,
		"X-Msh-Device-Name": os.hostname(),
		"X-Msh-Device-Model": getDeviceModel(),
		"X-Msh-Os-Version": os.version(),
		"X-Msh-Device-Id": await getDeviceId(),
	};
}
