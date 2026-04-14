import { spawn } from "node:child_process";
import { mkdtemp, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface AudioRecorder {
	start(): Promise<void>;
	stop(): Promise<string>; // returns path to recorded WAV file
	isRecording(): boolean;
}

function findRecorderCommand(): { cmd: string; args: string[] } | null {
	// macOS / Linux with sox
	if (process.platform === "darwin" || process.platform === "linux") {
		return { cmd: "sox", args: ["-d", "-t", "wav", "-r", "16000", "-c", "1", "-b", "16"] };
	}
	// Windows with sox
	if (process.platform === "win32") {
		return { cmd: "sox", args: ["-t", "waveaudio", "-d", "-t", "wav", "-r", "16000", "-c", "1", "-b", "16"] };
	}
	return null;
}

export function createAudioRecorder(): AudioRecorder {
	const recorder = findRecorderCommand();
	if (!recorder) {
		throw new Error("No supported audio recorder found. Install sox (https://sox.sourceforge.net/).");
	}

	let process_: ReturnType<typeof spawn> | null = null;
	let outputPath: string | null = null;
	let recording = false;

	return {
		async start(): Promise<void> {
			if (recording) throw new Error("Already recording");
			const dir = await mkdtemp(join(tmpdir(), "firm-stt-"));
			outputPath = join(dir, "recording.wav");
			process_ = spawn(recorder.cmd, [...recorder.args, outputPath], {
				stdio: "ignore",
			});
			recording = true;
		},
		async stop(): Promise<string> {
			if (!recording || !process_ || !outputPath) {
				throw new Error("Not recording");
			}
			process_.kill("SIGTERM");
			// Give sox a moment to flush the WAV header
			await new Promise((resolve) => setTimeout(resolve, 200));
			if (!process_.killed) {
				process_.kill("SIGKILL");
			}
			recording = false;
			const path = outputPath;
			outputPath = null;
			process_ = null;
			return path;
		},
		isRecording(): boolean {
			return recording;
		},
	};
}
