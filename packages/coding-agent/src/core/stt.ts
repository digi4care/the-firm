import { readFile, unlink } from "node:fs/promises";

export interface SttEngine {
	transcribe(audioFilePath: string, language?: string): Promise<string>;
}

export interface OpenAiSttEngineOptions {
	/** Returns the OpenAI API key. */
	getApiKey(): string | undefined;
	/** OpenAI client factory (for test injection). */
	createOpenAI?(options: { apiKey: string }): {
		audio: {
			transcriptions: {
				create(params: { file: File; model: string; language?: string }): Promise<{ text: string }>;
			};
		};
	};
}

export function createOpenAiSttEngine(options: OpenAiSttEngineOptions): SttEngine {
	return {
		async transcribe(audioFilePath: string, language?: string): Promise<string> {
			const apiKey = options.getApiKey();
			if (!apiKey) {
				throw new Error(
					"OpenAI API key is required for speech-to-text. Set it via OPENAI_API_KEY or /login openai.",
				);
			}

			// Lazy-load openai to avoid bundling it when STT is unused
			const { default: OpenAI } = await import("openai");
			const client = options.createOpenAI?.({ apiKey }) ?? new OpenAI({ apiKey });

			const buffer = await readFile(audioFilePath);
			const file = new File([buffer], "recording.wav", { type: "audio/wav" });

			try {
				const response = await client.audio.transcriptions.create({
					file,
					model: "whisper-1",
					language: language || undefined,
				});
				return response.text;
			} finally {
				// Best-effort cleanup
				unlink(audioFilePath).catch(() => {});
			}
		},
	};
}
