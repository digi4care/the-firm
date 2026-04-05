/**
 * Types for skill-creator extension
 */

export interface Tests {
	shouldTrigger: string[];
	shouldNotTrigger: string[];
	functional: string[];
}

export interface PlannedWrite {
	path: string;
	action: "create" | "update";
	content: string;
}

export interface QualityMetrics {
	score: number;
	wordCount: number;
	descriptionWordCount: number;
	descriptionHasUseWhen: boolean;
	descriptionHasNegative: boolean;
	hasWhenToUse: boolean;
	hasErrorHandling: boolean;
	hasQuickTests: boolean;
	hasReferences: boolean;
	hasWorkflow: boolean;
	useCount: number;
	avoidCount: number;
	workflowCount: number;
	errorCount: number;
	testCount: number;
	referenceCount: number;
}

export interface SkillPlan {
	name: string;
	purpose: string;
	descriptionDraft: string;
	triggers: string[];
	negativeTriggers: string[];
	workflow: string[];
	errorHandling: string[];
	tests: Tests;
	references: string[];
	constraints: string[];
	missing: string[];
	defaultsApplied: string[];
}

export interface CreatePlanResult {
	plan: SkillPlan;
	writes: PlannedWrite[];
	skillDir: string;
}

export interface OptimizePlanResult {
	skillDir: string;
	beforeMetrics: QualityMetrics;
	afterMetrics: QualityMetrics;
	scoreDelta: number;
	qualityGate: {
		enabled: boolean;
		passed: boolean;
	};
	writes: PlannedWrite[];
	updatesApplied: string[];
	missingReferences: string[];
	beforeContent: string;
	afterContent: string;
}

export interface AuditResult {
	wordCount: number;
	maxWords: number;
	checks: {
		hasWhenToUse: boolean;
		hasNegativeTriggers: boolean;
		hasErrorHandling: boolean;
		hasQuickTests: boolean;
		hasReferences: boolean;
		withinWordLimit: boolean;
	};
	missing: string[];
	warnings: string[];
}

export interface RegistryEntry {
	id: string;
	title: string;
	filename: string;
	category: "custom";
	description: string;
	keywords: string[];
	topics: string[];
	language: string;
	created: string;
	last_updated: string;
}

export interface Registry {
	version: string;
	created: string;
	last_updated: string;
	registry_type: "reference_documents";
	entries: RegistryEntry[];
}
