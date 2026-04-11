import { describe, expect, it } from "vitest";
import type { ContentCategory, ContentType } from "../../types/content.ts";
import { CONTENT_TYPE_TO_CATEGORY, isContentCategory, isContentType } from "../../types/content.ts";

describe("content types", () => {
	const ALL_TYPES: ContentType[] = ["concept", "decision", "pattern", "guide", "error", "standard", "spec", "rule"];

	const ALL_CATEGORIES: ContentCategory[] = [
		"concepts",
		"guides",
		"lookup",
		"errors",
		"specs",
		"templates",
		"archive",
	];

	describe("isContentType", () => {
		it("returns true for every valid ContentType", () => {
			for (const t of ALL_TYPES) {
				expect(isContentType(t)).toBe(true);
			}
		});

		it("returns false for invalid values", () => {
			expect(isContentType("problem")).toBe(false);
			expect(isContentType("research")).toBe(false);
			expect(isContentType("")).toBe(false);
			expect(isContentType("Concept")).toBe(false);
			expect(isContentType("concepts")).toBe(false);
		});
	});

	describe("isContentCategory", () => {
		it("returns true for every valid ContentCategory", () => {
			for (const c of ALL_CATEGORIES) {
				expect(isContentCategory(c)).toBe(true);
			}
		});

		it("returns false for invalid values", () => {
			expect(isContentCategory("concept")).toBe(false);
			expect(isContentCategory("")).toBe(false);
			expect(isContentCategory("Concepts")).toBe(false);
		});
	});

	describe("CONTENT_TYPE_TO_CATEGORY", () => {
		it("maps every ContentType to the correct category", () => {
			const expected: Record<ContentType, ContentCategory> = {
				concept: "concepts",
				decision: "concepts",
				pattern: "concepts",
				guide: "guides",
				error: "errors",
				standard: "lookup",
				spec: "specs",
				rule: "lookup",
			};

			for (const t of ALL_TYPES) {
				expect(CONTENT_TYPE_TO_CATEGORY[t]).toBe(expected[t]);
			}
		});

		it("covers all 8 ContentTypes", () => {
			expect(Object.keys(CONTENT_TYPE_TO_CATEGORY)).toHaveLength(8);
		});

		it("maps rule to lookup (rules standard lives in .firm/lookup/standards/)", () => {
			expect(CONTENT_TYPE_TO_CATEGORY.rule).toBe("lookup");
		});
	});

	describe("union sizes", () => {
		it("has exactly 8 ContentType members", () => {
			expect(ALL_TYPES).toHaveLength(8);
		});

		it("has exactly 7 ContentCategory members", () => {
			expect(ALL_CATEGORIES).toHaveLength(7);
		});
	});
});
