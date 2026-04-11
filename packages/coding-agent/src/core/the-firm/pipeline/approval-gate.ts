import type { Proposal } from "../types/index.js";

export type ApprovalMode = "auto" | "selective" | "dry-run";

export class ApprovalGate {
	// biome-ignore lint/suspicious/useAwait: async reserved for OMP runtime user-input in selective mode
	async approve(proposals: Proposal[], mode: ApprovalMode = "dry-run"): Promise<Proposal[]> {
		switch (mode) {
			case "auto":
				return proposals;
			case "dry-run":
				return [];
			case "selective":
				return proposals;
		}
	}
}
