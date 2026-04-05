/**
 * Tests for BgProcessManager
 */

import { describe, expect, it } from "bun:test";
import { BgProcessManager } from "../process-manager.js";

describe("BgProcessManager", () => {
	describe("register", () => {
		it("registers a new process", () => {
			const manager = new BgProcessManager();
			const proc = manager.register(1234, "echo hello", "/tmp/test.log");

			expect(proc.pid).toBe(1234);
			expect(proc.command).toBe("echo hello");
			expect(proc.logFile).toBe("/tmp/test.log");
			expect(proc.finished).toBe(false);
		});
	});

	describe("get", () => {
		it("returns registered process", () => {
			const manager = new BgProcessManager();
			manager.register(1234, "echo hello", "/tmp/test.log");

			const proc = manager.get(1234);
			expect(proc).toBeDefined();
			expect(proc?.pid).toBe(1234);
		});

		it("returns undefined for unknown pid", () => {
			const manager = new BgProcessManager();
			const proc = manager.get(9999);
			expect(proc).toBeUndefined();
		});
	});

	describe("markFinished", () => {
		it("marks process as finished", () => {
			const manager = new BgProcessManager();
			manager.register(1234, "echo hello", "/tmp/test.log");

			manager.markFinished(1234, 0);
			const proc = manager.get(1234);

			expect(proc?.finished).toBe(true);
			expect(proc?.exitCode).toBe(0);
		});
	});

	describe("delete", () => {
		it("removes process from registry", () => {
			const manager = new BgProcessManager();
			manager.register(1234, "echo hello", "/tmp/test.log");

			manager.delete(1234);
			expect(manager.get(1234)).toBeUndefined();
		});
	});

	describe("getAll", () => {
		it("returns all registered processes", () => {
			const manager = new BgProcessManager();
			manager.register(1234, "echo hello", "/tmp/test1.log");
			manager.register(5678, "echo world", "/tmp/test2.log");

			const all = manager.getAll();
			expect(all.length).toBe(2);
		});
	});

	describe("getStatus", () => {
		it("returns status for registered process", () => {
			const manager = new BgProcessManager();
			manager.register(1234, "echo hello", "/tmp/test.log");

			const status = manager.getStatus(1234);
			expect(status).toBeDefined();
			expect(status?.pid).toBe(1234);
			expect(status?.command).toBe("echo hello");
		});

		it("returns null for unknown pid", () => {
			const manager = new BgProcessManager();
			const status = manager.getStatus(9999);
			expect(status).toBeNull();
		});
	});

	describe("formatPreview", () => {
		it("truncates long output", () => {
			const manager = new BgProcessManager();
			const longText = "a".repeat(1000);
			const preview = manager.formatPreview(longText, 100);
			expect(preview.length).toBe(100);
		});

		it("returns short text unchanged", () => {
			const manager = new BgProcessManager();
			const preview = manager.formatPreview("hello", 100);
			expect(preview).toBe("hello");
		});
	});
});
