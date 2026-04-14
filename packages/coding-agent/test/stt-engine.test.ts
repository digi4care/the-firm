import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createOpenAiSttEngine } from "../src/core/stt.js";

describe("createOpenAiSttEngine", () => {
	it("throws when API key is missing", async () => {
		const engine = createOpenAiSttEngine({ getApiKey: () => undefined });
		await expect(engine.transcribe("/tmp/test.wav")).rejects.toThrow("OpenAI API key");
	});

	it("transcribes using injected OpenAI client", async () => {
		const tmpDir = mkdtempSync(join(tmpdir(), "stt-test-"));
		const audioPath = join(tmpDir, "test.wav");
		writeFileSync(audioPath, Buffer.from("fake wav data"));

		const engine = createOpenAiSttEngine({
			getApiKey: () => "test-key",
			createOpenAI: () => ({
				audio: {
					transcriptions: {
						async create(params) {
							expect(params.model).toBe("whisper-1");
							expect(params.language).toBe("nl");
							expect(params.file).toBeInstanceOf(File);
							return { text: "Hallo wereld" };
						},
					},
				},
			}),
		});

		const text = await engine.transcribe(audioPath, "nl");
		expect(text).toBe("Hallo wereld");
	});
});
