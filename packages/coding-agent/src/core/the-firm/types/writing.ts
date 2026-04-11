export interface WriteOperation {
	action: "create" | "update" | "move" | "delete";
	targetPath: string;
	content?: string;
	previousPath?: string;
	backupPath?: string;
}

export interface WriteResult {
	written: WriteOperation[];
	navigationsUpdated: string[];
	errors: string[];
}
