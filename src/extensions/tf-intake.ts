/**
 * Pi Extension: /tf-intake
 *
 * Initializes a new client and project for The Firm.
 * Creates ~/.firm/clients/<client-id>/client-dossier.yml
 * Creates ./.firm/project.yml
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { ClientDossierSchema } from "../lib/schemas/client-dossier.js";
import { ProjectConfigSchema } from "../lib/schemas/project.js";

interface ClientInfo {
	id: string;
	name: string;
	isNew: boolean;
}

export default function register(pi: ExtensionAPI) {
	pi.registerCommand("tf-intake", {
		description: "Initialize a new client and project intake for The Firm",
		handler: async (_args, ctx) => {
			try {
				// --- Path setup ---
				const globalDir = join(homedir(), ".firm");
				const clientsDir = join(globalDir, "clients");
				const projectDir = join(process.cwd(), ".firm");
				const projectFile = join(projectDir, "project.yml");

				// --- Check if project already initialized ---
				if (existsSync(projectFile)) {
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
					mkdirSync(clientDir, { recursive: true });

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
						ctx.ui.notify(
							`Client dossier validation failed: ${parseResult.error.message}`,
							"error",
						);
						return;
					}

					// Serialize to YAML
					const dossierYaml = `dossier:
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

					writeFileSync(join(clientDir, "client-dossier.yml"), dossierYaml, "utf-8");
				}

				// --- Create project config ---
				mkdirSync(projectDir, { recursive: true });

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
					ctx.ui.notify(
						`Project config validation failed: ${projectParseResult.error.message}`,
						"error",
					);
					return;
				}

				// Serialize to YAML
				const projectYaml = `project:
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

				writeFileSync(projectFile, projectYaml, "utf-8");

				// --- Success notification ---
				ctx.ui.notify(
					`Intake initialized!\nClient: ${clientName}\nProject: ${projectName}`,
					"info",
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`Intake failed: ${message}`, "error");
			}
		},
	});
}

/**
 * Get client info - either select existing or create new
 */
async function getClientInfo(
	ctx: {
		ui: {
			input: (prompt: string, placeholder: string) => Promise<string | undefined>;
			select: (
				prompt: string,
				options: Array<{ value: string; label: string }>,
			) => Promise<string | undefined>;
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
			// Try to read display names from existing dossiers
			const clientOptions = clientDirs.map((id) => {
				const dossierPath = join(clientsDir, id, "client-dossier.yml");
				let displayName = id;
				try {
					const content = readFileSync(dossierPath, "utf-8");
					// Simple extraction - look for display_name: value
					const match = content.match(/display_name:\s*(.+)/);
					if (match) displayName = match[1].trim();
				} catch {
					// Fallback to ID if can't read
				}
				return { value: id, label: displayName };
			});

			const options = [{ value: "__new__", label: "+ Create new client" }, ...clientOptions];

			const selected = await ctx.ui.select("Select client:", options);

			if (selected === undefined) return null; // Cancelled

			if (selected !== "__new__") {
				// Existing client
				const clientName = clientOptions.find((c) => c.value === selected)?.label || selected;
				return { id: selected, name: clientName, isNew: false };
			}
			// Fall through to new client flow
		}
	}

	// New client flow
	const clientName = await ctx.ui.input("Client name:", "My Client");
	if (!clientName) return null; // Cancelled

	const clientId = `firm-client-${timestamp}`;
	return { id: clientId, name: clientName, isNew: true };
}
