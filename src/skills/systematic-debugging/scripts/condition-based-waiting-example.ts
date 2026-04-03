// Complete implementation of condition-based waiting utilities
// From: Lace test infrastructure improvements (2025-10-03)
// Context: Fixed 15 flaky tests by replacing arbitrary timeouts

/**
 * Generic waitFor function - wait for a condition to become truthy
 *
 * @param condition - Function that returns truthy when condition is met
 * @param description - Human-readable description for error messages
 * @param timeoutMs - Maximum time to wait (default 5000ms)
 * @returns Promise resolving to the condition result
 *
 * Example:
 *   const result = await waitFor(() => getResult() !== undefined, 'result to be available');
 */
export function waitFor<T>(
	condition: () => T | undefined | null | false,
	description: string,
	timeoutMs = 5000,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();

		const check = () => {
			const result = condition();

			if (result) {
				resolve(result);
			} else if (Date.now() - startTime > timeoutMs) {
				reject(new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`));
			} else {
				setTimeout(check, 10); // Poll every 10ms for efficiency
			}
		};

		check();
	});
}

/**
 * Wait for a specific event type to appear
 *
 * @param getEvents - Function that returns current events array
 * @param eventType - Type of event to wait for
 * @param timeoutMs - Maximum time to wait (default 5000ms)
 * @returns Promise resolving to the first matching event
 *
 * Example:
 *   const event = await waitForEvent(() => threadManager.getEvents(threadId), 'TOOL_RESULT');
 */
export function waitForEvent<T extends { type: string }>(
	getEvents: () => T[],
	eventType: string,
	timeoutMs = 5000,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();

		const check = () => {
			const events = getEvents();
			const event = events.find((e) => e.type === eventType);

			if (event) {
				resolve(event);
			} else if (Date.now() - startTime > timeoutMs) {
				reject(new Error(`Timeout waiting for ${eventType} event after ${timeoutMs}ms`));
			} else {
				setTimeout(check, 10);
			}
		};

		check();
	});
}

/**
 * Wait for a specific number of events of a given type
 *
 * @param getEvents - Function that returns current events array
 * @param eventType - Type of event to wait for
 * @param count - Number of events to wait for
 * @param timeoutMs - Maximum time to wait (default 5000ms)
 * @returns Promise resolving to all matching events once count is reached
 *
 * Example:
 *   // Wait for 2 AGENT_MESSAGE events (initial response + continuation)
 *   const events = await waitForEventCount(() => getEvents(), 'AGENT_MESSAGE', 2);
 */
export function waitForEventCount<T extends { type: string }>(
	getEvents: () => T[],
	eventType: string,
	count: number,
	timeoutMs = 5000,
): Promise<T[]> {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();

		const check = () => {
			const events = getEvents();
			const matchingEvents = events.filter((e) => e.type === eventType);

			if (matchingEvents.length >= count) {
				resolve(matchingEvents);
			} else if (Date.now() - startTime > timeoutMs) {
				reject(
					new Error(
						`Timeout waiting for ${count} ${eventType} events after ${timeoutMs}ms (got ${matchingEvents.length})`,
					),
				);
			} else {
				setTimeout(check, 10);
			}
		};

		check();
	});
}

/**
 * Wait for an event matching a custom predicate
 * Useful when you need to check event data, not just type
 *
 * @param getEvents - Function that returns current events array
 * @param predicate - Function that returns true when event matches
 * @param description - Human-readable description for error messages
 * @param timeoutMs - Maximum time to wait (default 5000ms)
 * @returns Promise resolving to the first matching event
 *
 * Example:
 *   // Wait for TOOL_RESULT with specific ID
 *   const event = await waitForEventMatch(
 *     () => getEvents(),
 *     (e) => e.type === 'TOOL_RESULT' && e.data.id === 'call_123',
 *     'TOOL_RESULT with id=call_123'
 *   );
 */
export function waitForEventMatch<T>(
	getEvents: () => T[],
	predicate: (event: T) => boolean,
	description: string,
	timeoutMs = 5000,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();

		const check = () => {
			const events = getEvents();
			const event = events.find(predicate);

			if (event) {
				resolve(event);
			} else if (Date.now() - startTime > timeoutMs) {
				reject(new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`));
			} else {
				setTimeout(check, 10);
			}
		};

		check();
	});
}

// Usage example from actual debugging session:
//
// BEFORE (flaky):
// ---------------
// const messagePromise = agent.sendMessage('Execute tools');
// await new Promise(r => setTimeout(r, 300)); // Hope tools start in 300ms
// agent.abort();
// await messagePromise;
// await new Promise(r => setTimeout(r, 50));  // Hope results arrive in 50ms
// expect(toolResults.length).toBe(2);         // Fails randomly
//
// AFTER (reliable):
// ----------------
// const messagePromise = agent.sendMessage('Execute tools');
// await waitForEventCount(() => getEvents(threadId), 'TOOL_CALL', 2); // Wait for tools to start
// agent.abort();
// await messagePromise;
// await waitForEventCount(() => getEvents(threadId), 'TOOL_RESULT', 2); // Wait for results
// expect(toolResults.length).toBe(2); // Always succeeds
//
// Result: 60% pass rate → 100%, 40% faster execution
