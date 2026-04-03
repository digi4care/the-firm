/**
 * Pi Extension: /tf-intake
 *
 * Initializes a new client and project for The Firm.
 * Creates ~/.firm/clients/<client-id>/client-dossier.yml
 * Creates ./.firm/project.yml
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
	createTrackedDir,
	createTrackedFile,
	isProjectInitialized,
	rollbackPaths,
} from "./lib/project-state.js";
import { formatClientOptions, resolveSelectedClient } from "./lib/select-helpers.js";
import { ClientDossierSchema } from "./lib/client-dossier.js";
import { ProjectConfigSchema } from "./lib/project.js";

interface ClientInfo {
	id: string;
	name: string;
	isNew: boolean;
}

export default function register(pi: ExtensionAPI) {
	pi.registerCommand("tf-intake", {
		description: "Initialize a new client and project intake for The Firm",
		handler: async (_args, ctx) => {
			const tracked: string[] = [];

			try {
				// --- Path setup ---
				const globalDir = join(homedir(), ".firm");
				const clientsDir = join(globalDir, "clients");
				const projectDir = join(process.cwd(), ".firm");
				const projectFile = join(projectDir, "project.yml");

				// --- Check if project already initialized (Bug 3 fix: validates content) ---
				if (isProjectInitialized(projectFile)) {
					ctx.ui.notify("Project already initialized. Use /tf-status for info.", "info");
					return;
				}

				// --- Date helper ---
				const today = new Date().toISOString().split("T")[0];
				const timestamp = Date.now().toString(36);

				// --- Get or create client ---
				const clientInfo = await getClientInfo(ctx, clientsDir, timestamp);
				if (!clientInfo) return; // User cancelled

				const { id: clientId, name: clientName, isNew: isNewClient } = clientInfo;

				// --- Project details ---
				const projectId = `firm-project-${timestamp}`;
				const projectName = await ctx.ui.input("Project name:", "My Project");
				if (!projectName) return; // Cancelled

				const projectDesc = await ctx.ui.input("Brief description:", "");
				if (projectDesc === undefined) return; // Cancelled (empty string is valid)

				const stackInput = await ctx.ui.input("Primary stack (comma-separated):", "TypeScript");
				if (stackInput === undefined) return; // Cancelled
				const stack = stackInput
					.split(",")
					.map((s) => s.trim())
					.filter((s) => s.length > 0);
				if (stack.length === 0) stack.push("unknown");

				// --- Create client dossier (if new client) ---
				if (isNewClient) {
					const clientDir = join(clientsDir, clientId);
					createTrackedDir(clientDir, tracked);

					const dossierData = {
						dossier: { version: 1 as const },
						identity: {
							id: clientId,
							display_name: clientName,
							created: today,
							last_contact: today,
							source: "direct" as const,
							status: "active" as const,
						},
						profile: {
							background: "",
							skill_level: "intermediate" as const,
							known_stack: stack,
							availability: "evenings-and-weekends" as const,
							bandwidth: "limited" as const,
						},
						communication: {
							language: "en",
							response_language: "en",
							style: "direct" as const,
							accessibility: {
								needs: [],
								output_preferences: [],
							},
							mode: "collaborative" as const,
						},
						preferences: {
							quality_bar: "professional" as const,
							decision_velocity: "deliberate" as const,
							time_sensitivity: "normal" as const,
							success_criteria: [],
							constraints: [],
							engagement_style: "structured" as const,
						},
						engagement_history: {
							current: null,
							past: [],
						},
						patterns: {
							request_types: [],
							strengths: [],
							watch_outs: [],
							distilled: [],
						},
					};

					// Validate before writing
					const parseResult = ClientDossierSchema.safeParse(dossierData);
					if (!parseResult.success) {
						// Bug 2 fix: rollback on validation failure
						rollbackPaths(tracked);
						ctx.ui.notify(
							`Client dossier validation failed: ${parseResult.error.message}`,
							"error",
						);
						return;
					}

					// Serialize to YAML
					const dossierYaml = serializeDossierYaml(clientId, clientName, today, stack);
					createTrackedFile(join(clientDir, "client-dossier.yml"), dossierYaml, tracked);
				}

				// --- Create project config ---
				createTrackedDir(projectDir, tracked);

				const projectData = {
					project: { version: 1 as const },
					identity: {
						id: projectId,
						name: projectName,
						description: projectDesc,
						client_id: clientId,
						created: today,
						status: "active" as const,
					},
					technical_context: {
						stack: stack,
					},
					current_engagement: null,
					constraints: {
						additional: [],
						excluded: [],
					},
				};

				// Validate before writing
				const projectParseResult = ProjectConfigSchema.safeParse(projectData);
				if (!projectParseResult.success) {
					// Bug 2 fix: rollback on validation failure
					rollbackPaths(tracked);
					ctx.ui.notify(
						`Project config validation failed: ${projectParseResult.error.message}`,
						"error",
					);
					return;
				}

				// Serialize to YAML
				const projectYaml = serializeProjectYaml(
					projectId,
					projectName,
					projectDesc,
					clientId,
					today,
					stack,
				);
				createTrackedFile(projectFile, projectYaml, tracked);

				// --- Success notification ---
				ctx.ui.notify(
					`Intake initialized!\nClient: ${clientName}\nProject: ${projectName}`,
					"info",
				);
			} catch (error) {
				// Bug 2 fix: rollback on any uncaught error
				rollbackPaths(tracked);
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`Intake failed: ${message}`, "error");
			}
		},
	});
}

/**
 * Serialize client dossier to YAML string.
 */
function serializeDossierYaml(
	clientId: string,
	clientName: string,
	today: string,
	stack: string[],
): string {
	return `dossier:
  version: 1
identity:
  id: ${clientId}
  display_name: ${clientName}
  created: ${today}
  last_contact: ${today}
  source: direct
  status: active
profile:
  background: ''
  skill_level: intermediate
  known_stack:
${stack.map((s) => `    - ${s}`).join("\n")}
  availability: evenings-and-weekends
  bandwidth: limited
communication:
  language: en
  response_language: en
  style: direct
  accessibility:
    needs: []
    output_preferences: []
  mode: collaborative
preferences:
  quality_bar: professional
  decision_velocity: deliberate
  time_sensitivity: normal
  success_criteria: []
  constraints: []
  engagement_style: structured
engagement_history:
  current: null
  past: []
patterns:
  request_types: []
  strengths: []
  watch_outs: []
  distilled: []
`;
}

/**
 * Serialize project config to YAML string.
 */
function serializeProjectYaml(
	projectId: string,
	projectName: string,
	projectDesc: string,
	clientId: string,
	today: string,
	stack: string[],
): string {
	return `project:
  version: 1
identity:
  id: ${projectId}
  name: ${projectName}
  description: ${projectDesc}
  client_id: ${clientId}
  created: ${today}
  status: active
technical_context:
  stack:
${stack.map((s) => `    - ${s}`).join("\n")}
current_engagement: null
constraints:
  additional: []
  excluded: []
`;
}

/**
 * Get client info - either select existing or create new.
 *
 * Bug 1 fix: Uses formatClientOptions() to pass string[] to ctx.ui.select()
 * instead of {value, label} objects that render as "[object Object]".
 */
async function getClientInfo(
	ctx: {
		ui: {
			input: (prompt: string, placeholder: string) => Promise<string | undefined>;
			select: (prompt: string, options: string[]) => Promise<string | undefined>;
			notify: (msg: string, level: "info" | "warning" | "error") => void;
		};
	},
	clientsDir: string,
	timestamp: string,
): Promise<ClientInfo | null> {
	// Check for existing clients
	if (existsSync(clientsDir)) {
		const clientDirs = readdirSync(clientsDir, { withFileTypes: true })
			.filter((d) => d.isDirectory())
			.map((d) => d.name)
			.filter((name) => /^firm-client-[a-z0-9]+$/.test(name));

		if (clientDirs.length > 0) {
			// Read display names from existing dossiers
			const clients = clientDirs.map((id) => {
				const dossierPath = join(clientsDir, id, "client-dossier.yml");
				let displayName = id;
				try {
					const content = readFileSync(dossierPath, "utf-8");
					const match = content.match(/display_name:\s*(.+)/);
					if (match) displayName = match[1].trim();
				} catch {
					// Fallback to ID if can't read
				}
				return { id, name: displayName };
			});

			// Bug 1 fix: format as string[] for Pi's select API
			const options = formatClientOptions(clients);
			const selected = await ctx.ui.select("Select client:", options);

			// Resolve selected string back to client info
			const resolved = resolveSelectedClient(selected, clients);
			if (!resolved) return null; // Cancelled

			if (resolved.isNew) {
				// Fall through to new client flow
			} else {
				return { id: resolved.id, name: resolved.name, isNew: false };
			}
		}
	}

	// New client flow
	const clientName = await ctx.ui.input("Client name:", "My Client");
	if (!clientName) return null; // Cancelled

	const clientId = `firm-client-${timestamp}`;
	return { id: clientId, name: clientName, isNew: true };
}
