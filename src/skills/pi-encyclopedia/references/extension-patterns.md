# Extension Patterns

Common patterns for Pi extensions.

## Basic Tool

```typescript
import { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "my_tool",
    label: "My Tool",
    description: "Does something useful",
    parameters: Type.Object({
      input: Type.String({ description: "Input value" }),
    }),
    execute: async (toolCallId, params, signal, onUpdate, ctx) => {
      // Check cancellation
      if (signal?.aborted) {
        return { content: [{ type: "text", text: "Cancelled" }] };
      }

      // Stream progress
      onUpdate?.({ content: [{ type: "text", text: "Working..." }] });

      // Return result
      return {
        content: [{ type: "text", text: `Result: ${params.input}` }],
        details: { input: params.input },
      };
    },
  });
}
```

## Command with UI

```typescript
pi.registerCommand("mycommand", {
  description: "My custom command",
  handler: async (args, ctx) => {
    // Use UI
    const selected = await ctx.ui.select("Choose", [
      { value: "a", label: "Option A" },
      { value: "b", label: "Option B" },
    ]);

    if (selected) {
      ctx.ui.notify(`Selected: ${selected}`, "info");
    }
  },
});
```

## Event Handler

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (isToolCallEventType("bash", event)) {
    // Check bash command
    if (event.input.command.includes("rm -rf")) {
      return { block: true, reason: "Dangerous command" };
    }
  }
});
```

## Custom TUI Component

```typescript
import { Component, matchesKey, Key, truncateToWidth } from "@mariozechner/pi-tui";

class MyWidget implements Component {
  render(width: number): string[] {
    return [truncateToWidth("Widget content", width)];
  }

  handleInput(data: string): void {
    if (matchesKey(data, Key.enter)) {
      // Handle enter
    }
  }

  invalidate(): void {
    // Clear cache
  }
}

// Use in command
pi.registerCommand("widget", {
  handler: async (args, ctx) => {
    const handle = ctx.ui.custom(new MyWidget());
    // handle.close() when done
  },
});
```

## State Persistence

```typescript
// Store state in session
pi.appendEntry("my_state", { counter: 0 });

// Later, retrieve
const state = pi.getSessionData("my_state");
```
