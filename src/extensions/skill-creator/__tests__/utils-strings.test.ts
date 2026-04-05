/**
 * Tests for string utilities
 */

import { describe, expect, it } from "bun:test";
import {
	countWords,
	escapeRegExp,
	normalizeFileName,
	normalizeForMatch,
	splitSentences,
	toKebabCase,
	toTitleCase,
} from "../utils/strings.js";

describe("toKebabCase", () => {
	it("converts spaces to hyphens", () => {
		expect(toKebabCase("hello world")).toBe("hello-world");
	});

	it("handles multiple spaces", () => {
		expect(toKebabCase("hello   world")).toBe("hello-world");
	});

	it("removes leading/trailing hyphens", () => {
		expect(toKebabCase("-hello-world-")).toBe("hello-world");
	});

	it("handles empty string", () => {
		expect(toKebabCase("")).toBe("");
	});

	it("handles special characters", () => {
		expect(toKebabCase("hello@world#test")).toBe("hello-world-test");
	});
});

describe("toTitleCase", () => {
	it("converts kebab-case to Title Case", () => {
		expect(toTitleCase("hello-world")).toBe("Hello World");
	});

	it("handles single word", () => {
		expect(toTitleCase("hello")).toBe("Hello");
	});

	it("handles empty string", () => {
		expect(toTitleCase("")).toBe("");
	});

	it("handles multiple hyphens", () => {
		expect(toTitleCase("my-skill-creator")).toBe("My Skill Creator");
	});
});

describe("normalizeForMatch", () => {
	it("trims whitespace", () => {
		expect(normalizeForMatch("  hello  ")).toBe("hello");
	});

	it("removes quotes", () => {
		expect(normalizeForMatch('"hello"')).toBe("hello");
		expect(normalizeForMatch("'hello'")).toBe("hello");
	});

	it("removes trailing punctuation", () => {
		expect(normalizeForMatch("hello.")).toBe("hello");
		expect(normalizeForMatch("hello!")).toBe("hello");
		expect(normalizeForMatch("hello?")).toBe("hello");
	});

	it("converts to lowercase", () => {
		expect(normalizeForMatch("HELLO")).toBe("hello");
	});

	it("handles combined operations", () => {
		expect(normalizeForMatch('  "Hello!"  ')).toBe("hello");
	});
});

describe("escapeRegExp", () => {
	it("escapes special regex characters", () => {
		expect(escapeRegExp(".*+?^${}()|[]\\")).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
	});

	it("handles normal strings", () => {
		expect(escapeRegExp("hello")).toBe("hello");
	});

	it("handles empty string", () => {
		expect(escapeRegExp("")).toBe("");
	});
});

describe("countWords", () => {
	it("counts words in a sentence", () => {
		expect(countWords("hello world")).toBe(2);
	});

	it("handles multiple spaces", () => {
		expect(countWords("hello   world")).toBe(2);
	});

	it("handles leading/trailing whitespace", () => {
		expect(countWords("  hello world  ")).toBe(2);
	});

	it("handles empty string", () => {
		expect(countWords("")).toBe(0);
	});

	it("handles single word", () => {
		expect(countWords("hello")).toBe(1);
	});
});

describe("normalizeFileName", () => {
	it("converts to kebab-case with .md extension", () => {
		expect(normalizeFileName("My Document")).toBe("my-document.md");
	});

	it("removes existing .md extension before adding", () => {
		expect(normalizeFileName("my-document.md")).toBe("my-document.md");
	});

	it("removes .mdx extension", () => {
		expect(normalizeFileName("my-document.mdx")).toBe("my-document.md");
	});

	it("handles empty string", () => {
		expect(normalizeFileName("")).toBe("reference.md");
	});
});

describe("splitSentences", () => {
	it("splits on periods", () => {
		expect(splitSentences("Hello. World.")).toEqual(["Hello.", "World."]);
	});

	it("splits on exclamation marks", () => {
		expect(splitSentences("Hello! World!")).toEqual(["Hello!", "World!"]);
	});

	it("splits on question marks", () => {
		expect(splitSentences("Hello? World?")).toEqual(["Hello?", "World?"]);
	});

	it("handles mixed punctuation", () => {
		expect(splitSentences("Hello! How are you? I am fine.")).toEqual([
			"Hello!",
			"How are you?",
			"I am fine.",
		]);
	});

	it("handles single sentence", () => {
		expect(splitSentences("Hello world.")).toEqual(["Hello world."]);
	});

	it("handles empty string", () => {
		expect(splitSentences("")).toEqual([]);
	});
});
