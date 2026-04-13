import { describe, expect, it } from 'vitest';
import { buildBaseOptions } from '../src/providers/simple-options.js';
import type { Model, Api, SimpleStreamOptions } from '../src/types.js';

function makeModel(maxTokens = 128000): Model<Api> {
	return { maxTokens } as Model<Api>;
}

describe('buildBaseOptions sampling forwarding', () => {
	it('should forward all sampling params through buildBaseOptions', () => {
		const model = makeModel();
		const options: SimpleStreamOptions = {
			temperature: 0.7,
			topP: 0.9,
			topK: 50,
			minP: 0.05,
			presencePenalty: 0.6,
			repetitionPenalty: 1.2,
		};

		const result = buildBaseOptions(model, options);

		expect(result.temperature).toBe(0.7);
		expect(result.topP).toBe(0.9);
		expect(result.topK).toBe(50);
		expect(result.minP).toBe(0.05);
		expect(result.presencePenalty).toBe(0.6);
		expect(result.repetitionPenalty).toBe(1.2);
	});

	it('should omit undefined sampling params', () => {
		const model = makeModel();
		const options: SimpleStreamOptions = {
			temperature: 0.5,
		};

		const result = buildBaseOptions(model, options);

		expect(result.temperature).toBe(0.5);
		expect(result.topP).toBeUndefined();
		expect(result.topK).toBeUndefined();
		expect(result.minP).toBeUndefined();
		expect(result.presencePenalty).toBeUndefined();
		expect(result.repetitionPenalty).toBeUndefined();
	});

	it('should forward temperature: undefined as undefined', () => {
		const model = makeModel();
		const result = buildBaseOptions(model, {});

		expect(result.temperature).toBeUndefined();
		expect(result.topP).toBeUndefined();
	});
});
