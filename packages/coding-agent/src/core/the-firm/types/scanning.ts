export interface DetectedLanguage {
	name: string;
	confidence: number;
	evidence: string[];
}

export interface DetectedFramework {
	name: string;
	confidence: number;
	evidence: string[];
}

export interface DirectoryStructure {
	directories: string[];
	entryPoints: string[];
	testPatterns: string[];
}

export interface FirmState {
	exists: boolean;
	files: string[];
	standards: string[];
	navigationHealth: "healthy" | "stale" | "missing";
}

export interface RuleState {
	exists: boolean;
	files: string[];
	alwaysApply: string[];
	globBased: string[];
}

export interface ProjectProfile {
	root: string;
	languages: DetectedLanguage[];
	frameworks: DetectedFramework[];
	structure: DirectoryStructure;
	existingFirm: FirmState;
	existingRules: RuleState;
}
