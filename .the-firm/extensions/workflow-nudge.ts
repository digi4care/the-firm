/**
 * Workflow Nudge Extension (Layer 1 — soft reminder)
 *
 * Injects a brief, non-blocking reminder into the system prompt on every turn,
 * prompting the agent to follow the project workflow defined in docs/WORKFLOW.md.
 *
 * This is intentionally lightweight: no blocking, no state tracking, no gates.
 * Just a persistent nudge that keeps the workflow top-of-mind.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@digi4care/the-firm";

const NUDGE = `[workflow nudge] Before editing code or making changes: have you checked Beads (bd search/ready), claimed an issue, and created a worktree? If not, follow docs/WORKFLOW.md first. For quick questions, research, or exploratory work this can be skipped.`;

export default function workflowNudge(pi: ExtensionAPI) {
  let hasWorkflow = false;

  pi.on("session_start", async (_event, ctx) => {
    const workflowPath = path.join(ctx.cwd, "docs", "WORKFLOW.md");
    hasWorkflow = fs.existsSync(workflowPath);
  });

  pi.on("before_agent_start", async (event) => {
    if (!hasWorkflow) return;

    return {
      systemPrompt:
        event.systemPrompt +
        `

${NUDGE}
`,
    };
  });
}
