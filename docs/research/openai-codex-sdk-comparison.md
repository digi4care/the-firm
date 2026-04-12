# Onderzoek: OpenAI Codex SDK vs The Firm Provider

**Beads:** the-firm-pp6
**Datum:** 2026-04-12
**Status:** Complete

## Samenvatting

De OpenAI Codex SDK (`@openai/codex-sdk`) en onze provider (`@digi4care/the-firm-ai` → `openai-codex-responses.ts`) lossen **verschillende problemen op** en zijn **complementair**, niet concurrerend.

| Dimensie | Codex SDK | The Firm Provider |
|----------|-----------|-------------------|
| **Architectuur** | Subprocess-wrapper om Codex CLI binary (Rust) | Directe HTTP/WebSocket naar OpenAI Responses API |
| **Scope** | Volledige agent-sessie (tools, sandbox, MCP) | Streaming API-laag (model I/O only) |
| **Runtime** | Vereist platform-specifieke Rust binary | Pure TypeScript, overal waar fetch/WebSocket werkt |
| **Agent-executie** | Codex CLI draait de agent-loop (tools, file edits, commands) | The Firm zelf is de agent-loop; provider is slechts LLM transport |
| **Threading model** | Thread → Turn → Item (JSONL via stdout) | AssistantMessageEventStream (SSE/WS events) |

## Gedetailleerde Vergelijking

### 1. Architectuur

**Codex SDK:**
```
TypeScript SDK → spawn Rust binary → JSONL stdout → parse events
```
De SDK is een **thin wrapper** rond de Codex CLI binary. Het start een child process, stuurt input via stdin, en leest JSONL events van stdout. De eigenlijke agent-logica (tool execution, sandboxing, file edits) draait allemaal in de Rust binary.

**The Firm Provider:**
```
TypeScript → fetch/WebSocket → OpenAI Responses API → SSE/WS events → AssistantMessageEventStream
```
Onze provider praat **direct** met de OpenAI Responses API via HTTP SSE of WebSocket. De agent-loop, tool execution, en sandboxing draaien allemaal in The Firm zelf (TypeScript).

### 2. API Surface

**Codex SDK (5 classes/functions):**
```typescript
const codex = new Codex({ apiKey: "..." });
const thread = codex.startThread({ model: "o3" });
const { events } = await thread.runStreamed("Fix the bug in main.ts");
for await (const event of events) {
  // ThreadEvent: thread.started, turn.started, item.started,
  // item.completed, turn.completed, turn.failed
}
```

**The Firm Provider (low-level stream function):**
```typescript
const stream = streamOpenAICodexResponses(model, context, options);
stream.subscribe((event) => {
  // AssistantMessageEvent: text_delta, thinking_delta, tool_call, done, error
});
```

### 3. Item Types

**Codex SDK items:** `AgentMessageItem`, `CommandExecutionItem`, `FileChangeItem`, `McpToolCallItem`, `WebSearchItem`, `TodoListItem`, `ReasoningItem`, `ErrorItem`

**The Firm items:** Tool execution, file edits, MCP calls, etc. worden **binnen The Firm's eigen agent-loop** afgehandeld. De provider ziet alleen LLM-requests/responses (text, tool_calls, thinking).

### 4. Transport

| Feature | Codex SDK | The Firm |
|---------|-----------|----------|
| SSE | ✗ (gebruikt subprocess) | ✅ |
| WebSocket | ✗ | ✅ (met session caching, idle expiry) |
| Retry logic | ✗ (CLI handelt af) | ✅ (3 retries, exponential backoff) |
| Auth | JWT extraction, account-id | JWT extraction, account-id |
| Session resume | ✅ (`resumeThread(id)`) | ✅ (via sessionId + WebSocket cache) |

### 5. Waar onze provider sterker is

1. **Directe API access** — Geen subprocess overhead, geen Rust binary dependency
2. **WebSocket session caching** — Hergebruik verbindingen binnen een sessie, idle timeout cleanup
3. **Transport keuze** — SSE of WebSocket, configureerbaar per request
4. **Cross-platform** — Werkt overal waar Node.js/Bun draait (incl. browser voor web-ui)
5. **Retry met backoff** — Ingebouwd in de provider, niet afhankelijk van CLI
6. **Integratie met The Firm's agent-loop** — Tool execution, compaction, steering, etc.

### 6. Waar de Codex SDK sterker is

1. **Eenvoudig** — 3 classes, geen kennis van Responses API nodig
2. **Volledige agent** — Sandbox, file edits, MCP, web search ingebouwd
3. **Structured output** — Native `outputSchema` via Zod
4. **Todo tracking** — Ingebouwde todo list items
5. **Platform binaries** — Geoptimaliseerde Rust executie met OS-level sandboxing

### 7. Conclusie & Aanbeveling

**NIET migreren naar Codex SDK.** Redenen:

1. **Verschillende abstractielagen** — Codex SDK wrapt een volledige agent; wij zíjn de agent. Onze provider is het transport naar het model, niet de agent zelf.

2. **Subprocess overhead** — Elke `run()` start een child process. Voor The Firm's interactieve mode (waar we tientallen turns per sessie doen) is direct HTTP/WebSocket efficiënter.

3. **Platform dependency** — Codex SDK vereist platform-specifieke Rust binaries (`@openai/codex-linux-x64`, etc.). Onze pure-TS aanpak werkt overal.

4. **Control** — We hebben fine-grained control over retry, transport, caching, auth, en event streaming die we niet zouden hebben via een subprocess.

**WEL overnemen:**
- **Item type design** — Codex SDK's `ThreadItem` union type is cleaner dan onze ad-hoc event types. Overwegen voor toekomstige refactoring van `AssistantMessageEventStream`.
- **Structured output** — Hun `outputSchema` met Zod is elegant. We kunnen dit toevoegen aan onze provider opties.
- **Todo tracking items** — Hun `TodoListItem` in de event stream is nuttig. We hebben iets vergelijkbaars in onze todo tool maar het is niet zichtbaar in de stream.

**Actie:** Geen wijzigingen nodig. Dit is een research-only bead.
