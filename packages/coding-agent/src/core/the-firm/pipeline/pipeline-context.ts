import type { ProjectProfile, Proposal, ValidationResult, WriteResult } from "../types/index.js";

/**
 * Mutable state bag that flows through the pipeline stages.
 * Each stage reads from and writes to this single context object.
 */
export class PipelineContext {
	readonly projectRoot: string;
	profile: ProjectProfile | null = null;
	rawAnalysis: unknown[] = [];
	proposals: Proposal[] = [];
	validationResult: ValidationResult | null = null;
	approvedProposals: Proposal[] = [];
	writeResult: WriteResult | null = null;

	constructor(projectRoot: string) {
		this.projectRoot = projectRoot;
	}
}
