/**
 * Auto Session Name Extension
 *
 * Automatically names sessions based on the first user message.
 * Extracts up to 60 characters from the first prompt as the session name.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getSetting } from "./settings/lib/settings-store";

export default function (pi: ExtensionAPI) {
	let named = false;

	function isEnabled(): boolean {
		const val = getSetting("theFirm.autoSessionName");
		return val === false ? false : true; // default true
	}

	pi.on("session_start", async (_event, _ctx) => {
		// Check if session already has a name
		named = !!pi.getSessionName();
	});

	pi.on("agent_end", async (event) => {
		// Skip if feature disabled or already named
		if (!isEnabled()) return;
		if (named) return;

		// Find the first user message
		const userMsg = event.messages.find((m) => m.role === "user");
		if (!userMsg) return;

		// Extract text content
		let text: string;
		if (typeof userMsg.content === "string") {
			text = userMsg.content;
		} else {
			text = userMsg.content
				.filter((b) => b.type === "text")
				.map((b) => (b as { text: string }).text)
				.join(" ");
		}

		if (!text) return;

		// Create session name from first 60 chars
		const name = text.slice(0, 60).replace(/\n/g, " ").trim();
		if (name) {
			pi.setSessionName(name);
			named = true;
		}
	});
}
