# Visual Web Debugging

## Overview

For web applications, traditional code-level debugging often misses the full picture. Visual debugging uses browser automation (Playwright) to observe actual behavior, capture runtime state, and identify issues that static analysis cannot detect.

## When to Use

**Use visual debugging when:**

- UI renders incorrectly or behaves unexpectedly
- Bugs only appear in specific browser states
- Client-server interaction issues
- Race conditions in async operations
- CSS/styling problems
- JavaScript errors only in browser context

**Combine with systematic debugging:**
Visual debugging is Phase 1 (Investigation) for webapps - it gathers evidence before forming hypotheses.

## The Visual Debugging Workflow

### 1. Start Dev Server

```bash
# Start development server in background
npm run dev &
# or
bun run dev &

# Wait for server to be ready
curl -s http://localhost:3000 > /dev/null && echo "Server ready"
```

### 2. Launch Playwright Browser

```typescript
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: false, // Visible browser for debugging
  devtools: true, // Open DevTools automatically
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: "videos/" }, // Capture session
});

const page = await context.newPage();
```

### 3. Monitor Multiple Sources

```typescript
// Capture console logs
page.on("console", (msg) => {
  console.log(`[${msg.type()}] ${msg.text()}`);
});

// Capture JavaScript errors
page.on("pageerror", (error) => {
  console.error(`[Page Error] ${error.message}`);
});

// Capture network requests/responses
page.on("request", (request) => {
  console.log(`[Request] ${request.method()} ${request.url()}`);
});

page.on("response", (response) => {
  console.log(`[Response] ${response.status()} ${response.url()}`);
});

// Capture failed requests
page.on("requestfailed", (request) => {
  console.error(`[Failed] ${request.url()} - ${request.failure()?.errorText}`);
});
```

### 4. Navigate and Observe

```typescript
// Navigate to the page
await page.goto("http://localhost:3000");

// Wait for critical elements
await page.waitForSelector('[data-testid="app"]');

// Take screenshot for visual comparison
await page.screenshot({
  path: "screenshot-initial.png",
  fullPage: true,
});

// Perform actions that trigger the bug
await page.click("button#submit");

// Wait for async operations
await page.waitForTimeout(1000); // Or better: wait for specific state

// Capture final state
await page.screenshot({
  path: "screenshot-after-action.png",
  fullPage: true,
});
```

### 5. Extract Runtime State

```typescript
// Get console logs
const logs = await page.evaluate(() => window.consoleLogs);

// Check for JavaScript errors
const errors = await page.evaluate(() => window.jsErrors);

// Inspect DOM state
const html = await page.content();

// Check specific element
const elementText = await page.textContent(".error-message");
const elementVisible = await page.isVisible(".error-message");

// Get network activity summary
const networkStats = await page.evaluate(() => {
  return performance.getEntriesByType("resource").map((r) => ({
    name: r.name,
    duration: r.duration,
    status: r.responseStatus,
  }));
});
```

## Common Debugging Scenarios

### Scenario 1: UI Not Updating

```typescript
// Check if state actually changed
const before = await page.textContent(".counter");
await page.click("button#increment");
const after = await page.textContent(".counter");

console.log(`Before: ${before}, After: ${after}`);
// If same: state management issue
// If different but UI not reflecting: rendering issue
```

### Scenario 2: API Call Failing

```typescript
// Monitor specific API endpoint
page.on("response", async (response) => {
  if (response.url().includes("/api/data")) {
    const status = response.status();
    const body = await response.json().catch(() => null);

    console.log(`API Status: ${status}`);
    console.log(`API Response:`, body);

    if (status >= 400) {
      console.error("API Error detected!");
    }
  }
});
```

### Scenario 3: Race Condition

```typescript
// Capture timing information
const startTime = Date.now();

await Promise.all([
  page.click("button#load-data"),
  page.waitForResponse("**/api/data"),
  page.waitForSelector(".loading", { state: "hidden" }),
]);

const duration = Date.now() - startTime;
console.log(`Operation took ${duration}ms`);

// Check for race: does data appear before loading spinner disappears?
```

### Scenario 4: CSS/Layout Issues

```typescript
// Get computed styles
const styles = await page.evaluate((selector) => {
  const element = document.querySelector(selector);
  if (!element) return null;
  const computed = window.getComputedStyle(element);
  return {
    width: computed.width,
    height: computed.height,
    display: computed.display,
    visibility: computed.visibility,
    position: computed.position,
  };
}, ".problematic-element");

console.log("Computed styles:", styles);

// Compare with expected
if (styles.display === "none") {
  console.log("Element is hidden!");
}
```

## Integration with Systematic Debugging

### Phase 1: Investigation (Visual)

```typescript
async function investigateVisually(url: string) {
  // 1. Start server and browser
  // 2. Capture initial state (screenshot, console, network)
  // 3. Reproduce the bug
  // 4. Capture error state (screenshot, console, network)
  // 5. Extract all evidence

  return {
    screenshots: ['initial.png', 'error.png'],
    consoleLogs: [...],
    networkActivity: [...],
    domState: '...',
    jsErrors: [...],
  };
}
```

### Phase 2: Pattern Analysis

Compare visual states:

- What changed between screenshots?
- Which console errors appeared after which action?
- Which network requests failed?
- What does the DOM look like vs. what it should be?

### Phase 3: Hypothesis Formation

Based on visual evidence:

- "Error occurs after API call returns 500" → Backend issue
- "UI doesn't update but state changes" → Rendering bug
- "Works on click but not on keyboard" → Event handling bug
- "Element hidden by CSS" → Styling issue

### Phase 4: Fix and Verify

```typescript
// Apply fix
await applyFix();

// Restart server
await restartDevServer();

// Re-test visually
const result = await investigateVisually(url);

// Verify fix
if (result.jsErrors.length === 0 && result.screenshots.matchExpected()) {
  console.log("✅ Fix verified visually");
}
```

## Best Practices

### Always Capture Baseline

```typescript
// Before any actions
await page.screenshot({ path: "baseline.png" });
const baselineConsole = await getConsoleLogs(page);
```

### Use Specific Selectors

```typescript
// ❌ Fragile
await page.click("button");

// ✅ Robust
await page.click('[data-testid="submit-button"]');
```

### Wait for State, Not Time

```typescript
// ❌ Flaky
await page.waitForTimeout(1000);

// ✅ Reliable
await page.waitForSelector(".success-message");
await page.waitForResponse("**/api/complete");
```

### Clean Up Resources

```typescript
await context.close();
await browser.close();
// Kill dev server
process.kill(serverPid);
```

## Quick Start Script

```bash
#!/bin/bash
# debug-webapp.sh - One-command visual debugging

# 1. Start dev server
npm run dev &
SERVER_PID=$!
sleep 3

# 2. Run Playwright debugger
npx playwright test debug.spec.ts --headed

# 3. Cleanup on exit
trap "kill $SERVER_PID" EXIT
```

## Tools Comparison

| Tool | Best For | Learning Curve |
|------|----------|----------------|
| Playwright | Automated debugging, CI/CD | Medium |
| Cypress | Interactive debugging, time-travel | Low |
| Puppeteer | Chrome-specific, simple cases | Low |
| Selenium | Cross-browser, legacy support | High |

## References

- [Playwright Documentation](https://playwright.dev/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- `scripts/find-polluter.sh` - For finding test pollution
- `references/root-cause-tracing.md` - Combine with visual evidence
