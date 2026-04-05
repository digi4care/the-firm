/**
 * Tests for list utilities
 */

import { describe, expect, it } from "bun:test";
import { mergeLists, normalizeList, parseListItems, unique } from "../utils/lists.js";

describe("normalizeList", () => {
	it("trims whitespace from items", () => {
		expect(normalizeList(["  hello  ", "  world  "])).toEqual(["hello", "world"]);
	});

	it("filters empty strings", () => {
		expect(normalizeList(["hello", "", "world", ""])).toEqual(["hello", "world"]);
	});

	it("returns empty array for undefined", () => {
		expect(normalizeList(undefined)).toEqual([]);
	});

	it("returns empty array for empty array", () => {
		expect(normalizeList([])).toEqual([]);
	});
});

describe("unique", () => {
	it("removes duplicates from array", () => {
		expect(unique(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
	});

	it("works with numbers", () => {
		expect(unique([1, 2, 1, 3, 2])).toEqual([1, 2, 3]);
	});

	it("handles empty array", () => {
		expect(unique([])).toEqual([]);
	});

	it("handles no duplicates", () => {
		expect(unique(["a", "b", "c"])).toEqual(["a", "b", "c"]);
	});
});

describe("mergeLists", () => {
	it("merges two lists without duplicates", () => {
		expect(mergeLists(["a", "b"], ["c", "d"])).toEqual(["a", "b", "c", "d"]);
	});

	it("removes duplicates between lists", () => {
		expect(mergeLists(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
	});

	it("handles case-insensitive duplicates", () => {
		expect(mergeLists(["Hello"], ["hello"])).toEqual(["Hello"]);
	});

	it("handles empty primary list", () => {
		expect(mergeLists([], ["a", "b"])).toEqual(["a", "b"]);
	});

	it("handles empty fallback list", () => {
		expect(mergeLists(["a", "b"], [])).toEqual(["a", "b"]);
	});

	it("handles both empty", () => {
		expect(mergeLists([], [])).toEqual([]);
	});

	it("removes quotes from items", () => {
		expect(mergeLists(['"hello"'], [])).toEqual(["hello"]);
	});
});

describe("parseListItems", () => {
	it("parses bullet list", () => {
		const body = "- item one\n- item two\n- item three";
		expect(parseListItems(body)).toEqual(["item one", "item two", "item three"]);
	});

	it("parses numbered list", () => {
		const body = "1. item one\n2. item two\n3. item three";
		expect(parseListItems(body)).toEqual(["item one", "item two", "item three"]);
	});

	it("filters placeholder items", () => {
		const body = "- item one\n- <add something>\n- item two";
		expect(parseListItems(body)).toEqual(["item one", "item two"]);
	});

	it("handles empty lines", () => {
		const body = "- item one\n\n- item two";
		expect(parseListItems(body)).toEqual(["item one", "item two"]);
	});

	it("returns empty array for empty string", () => {
		expect(parseListItems("")).toEqual([]);
	});
});
