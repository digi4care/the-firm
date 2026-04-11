/**
 * Content types and categories for the the-firm knowledge base.
 *
 * ContentType identifies what kind of artifact a file represents.
 * ContentCategory maps types to their parent directory in .firm/.
 */

export type ContentType =
	| "concept"
	| "decision"
	| "pattern"
	| "guide"
	| "error"
	| "standard"
	| "spec"
	| "rule";

export type ContentCategory =
	| "concepts"
	| "guides"
	| "lookup"
	| "errors"
	| "specs"
	| "templates"
	| "archive";

const CONTENT_TYPES: ReadonlySet<string> = new Set<ContentType>([
	"concept",
	"decision",
	"pattern",
	"guide",
	"error",
	"standard",
	"spec",
	"rule",
]);

const CONTENT_CATEGORIES: ReadonlySet<string> = new Set<ContentCategory>([
	"concepts",
	"guides",
	"lookup",
	"errors",
	"specs",
	"templates",
	"archive",
]);

export function isContentType(value: string): value is ContentType {
	return CONTENT_TYPES.has(value);
}

export function isContentCategory(value: string): value is ContentCategory {
	return CONTENT_CATEGORIES.has(value);
}

/** Maps each ContentType to the ContentCategory directory it lives in under .firm/ */
export const CONTENT_TYPE_TO_CATEGORY: Record<ContentType, ContentCategory> = {
	concept: "concepts",
	decision: "concepts",
	pattern: "concepts",
	guide: "guides",
	error: "errors",
	standard: "lookup",
	spec: "specs",
	rule: "lookup",
};
