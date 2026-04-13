# LSP/AST Integratie Ontwerp — The Firm

## Samenvatting Onderzoek

Na analyse van oh-my-pi en de huidige The Firm architectuur, presenteer ik een ontwerp voor LSP/AST-integratie dat **Mario's filosofie als default** hanteert, met opt-in mogelijkheden via de settings API.

## Bevindingen uit oh-my-pi

### LSP Settings (in `packages/coding-agent/src/config/settings-schema.ts`)

| Setting | Type | Default | UI Tab | Beschrijving |
|---------|------|---------|--------|--------------|
| `lsp.enabled` | boolean | `true` | editing | Enable the lsp tool for language server protocol |
| `lsp.formatOnWrite` | boolean | `false` | editing | Automatically format code files using LSP after writing |
| `lsp.diagnosticsOnWrite` | boolean | `true` | editing | Return LSP diagnostics after writing code files |
| `lsp.diagnosticsOnEdit` | boolean | `false` | editing | Return LSP diagnostics after editing code files |

### AST Settings

| Setting | Type | Default | UI Tab | Beschrijving |
|---------|------|---------|--------|--------------|
| `astGrep.enabled` | boolean | `true` | tools | Enable the ast_grep tool for structural AST search |
| `astEdit.enabled` | boolean | `true` | tools | Enable the ast_edit tool for structural AST rewrites |

### Key Observations

1. **Mario's filosofie in oh-my-pi**: Ondanks dat `lsp.diagnosticsOnEdit` bestaat, is deze **default `false`** — exact zoals Mario beschrijft in zijn praatje. De LSP injecteert geen fouten tijdens het edit-proces.

2. **Tool-level enablement**: Alle tools (LSP, AST, etc.) kunnen individueel aan/uit worden gezet via `*.enabled` flags.

3. **Writethrough pattern**: LSP formatting/diagnostics gebeuren via een `WritethroughCallback` die pas wordt aangeroepen **nadat** de file write/complete is.

## Ontwerp voor The Firm

### 1. Settings Schema Uitbreiding

Nieuwe settings provider: `packages/coding-agent/src/features/settings/code-intelligence.ts`

```typescript
export const codeIntelligenceSettings: SettingsProvider = {
  id: "codeIntelligence",
  settings: {
    // LSP Settings — Editing tab
    "lsp.enabled": {
      type: "boolean",
      default: false,  // ← Mario's filosofie: default UIT
      ui: {
        tab: "editing",
        label: "LSP Tool",
        description: "Enable the lsp tool for language server protocol integration",
      },
    },
    "lsp.diagnosticsMode": {
      type: "enum",
      values: ["off", "onWrite", "onBatchComplete"] as const,
      default: "onBatchComplete",  // ← Mario's filosofie: pas na batch
      ui: {
        tab: "editing",
        label: "LSP Diagnostics Mode",
        description: "When to return LSP diagnostics (off / after write / after batch complete)",
        submenu: true,
      },
    },
    "lsp.formatOnWrite": {
      type: "boolean",
      default: false,
      ui: {
        tab: "editing",
        label: "Format on Write",
        description: "Automatically format code files using LSP after writing",
      },
    },
    
    // AST Settings — Tools tab
    "ast.enabled": {
      type: "boolean",
      default: false,  // ← Mario's filosofie: default UIT
      ui: {
        tab: "tools",
        label: "AST Tools",
        description: "Enable ast_grep and ast_edit tools for structural code search/rewrite",
      },
    },
    "ast.grepEnabled": {
      type: "boolean",
      default: true,
      condition: () => settingsManager.get("ast.enabled"),  // Alles zichtbaar als ast.enabled
      ui: {
        tab: "tools",
        label: "AST Grep",
        description: "Enable structural AST search (requires ast.enabled)",
      },
    },
    "ast.editEnabled": {
      type: "boolean",
      default: true,
      ui: {
        tab: "tools",
        label: "AST Edit",
        description: "Enable structural AST rewrites (requires ast.enabled)",
      },
    },
  },
};
```

### 2. Architectuur Integratie

#### A. Tool Registration Pattern

In `packages/coding-agent/src/core/tools/index.ts`:

```typescript
// Tool availability check — volgens Mario's filosofie
function isToolAvailable(name: string, settingsManager: SettingsManager): boolean {
  switch (name) {
    case "lsp":
      return settingsManager.get("lsp.enabled") === true;
    case "ast_grep":
      return settingsManager.get("ast.enabled") === true && 
             settingsManager.get("ast.grepEnabled") !== false;
    case "ast_edit":
      return settingsManager.get("ast.enabled") === true && 
             settingsManager.get("ast.editEnabled") !== false;
    // ... andere tools
  }
}
```

#### B. LSP Integration Strategy

**Belangrijk**: Geen LSP tijdens edit-batch, pas na afloop.

```typescript
// In edit tool — Mario's filosofie: geen interrupts tijdens edit
export class EditTool {
  async execute(callId: string, params: EditParams): Promise<AgentToolResult> {
    // 1. Voer edit uit zonder LSP interrupts
    const result = await this.executeEdit(params);
    
    // 2. LSP pas NA de edit (indien ingeschakeld en mode = onWrite)
    if (this.shouldRunLspAfterEdit()) {
      await this.runLspCheck(params.file);
    }
    
    return result;
  }
  
  private shouldRunLspAfterEdit(): boolean {
    const mode = this.settings.get("lsp.diagnosticsMode");
    return mode === "onWrite" || mode === "onBatchComplete";
  }
}

// Batch-level LSP check (Mario's filosofie: natural sync point)
export class ToolExecutor {
  async executeBatch(tools: ToolCall[]): Promise<ToolResult[]> {
    const results = [];
    for (const tool of tools) {
      results.push(await this.execute(tool));
    }
    
    // LSP check pas NA complete batch
    if (this.settings.get("lsp.diagnosticsMode") === "onBatchComplete") {
      await this.runBatchLspCheck(results);
    }
    
    return results;
  }
}
```

#### C. AST Integration

AST tools zijn **aparte tools** (niet integrated in edit), volgens Mario's filosofie van kleine, composeerbare tools:

```typescript
// AST Grep Tool — standalone tool, niet geïntegreerd in read
export class AstGrepTool implements AgentTool<typeof astGrepSchema> {
  readonly name = "ast_grep";
  readonly label = "AST Grep";
  readonly description = "Structural AST search using tree-sitter patterns";
  
  async execute(query: string, pattern: string): Promise<AstMatch[]> {
    // Gebruik tree-sitter voor structurele search
    return this.astEngine.grep(query, pattern);
  }
}

// AST Edit Tool — standalone tool
export class AstEditTool implements AgentTool<typeof astEditSchema> {
  readonly name = "ast_edit";
  readonly label = "AST Edit";
  readonly description = "Structural AST rewrites using tree-sitter";
  
  async execute(file: string, transformations: AstTransformation[]): Promise<void> {
    // Pas transformations toe via AST manipulation
    return this.astEngine.edit(file, transformations);
  }
}
```

### 3. Settings API Integratie

#### Registration in bootstrap

```typescript
// packages/coding-agent/src/core/settings-bootstrap.ts
import { codeIntelligenceSettings } from "../features/settings/code-intelligence.js";

export function bootstrapSettings(): void {
  // ... existing providers
  settingsRegistry.register(codeIntelligenceSettings);
}
```

#### SettingsManager Access

```typescript
// In SettingsManager class — generic get/set ondersteunt dit al
getLspEnabled = (): boolean => (this.get("lsp.enabled") ?? false) as boolean;
getLspDiagnosticsMode = (): "off" | "onWrite" | "onBatchComplete" => 
  (this.get("lsp.diagnosticsMode") ?? "onBatchComplete") as "off" | "onWrite" | "onBatchComplete";
getAstEnabled = (): boolean => (this.get("ast.enabled") ?? false) as boolean;
```

### 4. Configuratie Opties Samenvatting

| Setting | Default | Mario's Filosofie | Override Mogelijk |
|---------|---------|-------------------|-------------------|
| `lsp.enabled` | `false` | LSP default uit — geen "dark matter" | Ja, via settings UI of config |
| `lsp.diagnosticsMode` | `onBatchComplete` | Pas na batch complete — geen interrupts | Ja, `off` / `onWrite` / `onBatchComplete` |
| `lsp.formatOnWrite` | `false` | Format alleen als expliciet gewenst | Ja, toggle in settings |
| `ast.enabled` | `false` | AST tools default uit | Ja, via settings UI |
| `ast.grepEnabled` | `true` | Sub-tool opt-in (alleen als ast.enabled) | Ja, individuele toggle |
| `ast.editEnabled` | `true` | Sub-tool opt-in (alleen als ast.enabled) | Ja, individuele toggle |

### 5. Implementatie Volgorde

1. **Settings Provider** — Maak `code-intelligence.ts` settings provider
2. **Bootstrap** — Registreer provider in `settings-bootstrap.ts`
3. **Tool stubs** — Creëer LSP en AST tool classes (empty implementations)
4. **Tool availability** — Wijzig tool availability checks
5. **LSP Engine** — Implementeer LSP client (via lsp-client library)
6. **AST Engine** — Implementeer AST tools (via tree-sitter)
7. **Integration** — LSP writethrough pattern in edit/write tools

### 6. Vergelijking met oh-my-pi

| Aspect | oh-my-pi | The Firm (voorstel) |
|--------|----------|---------------------|
| `lsp.enabled` default | `true` | `false` — Mario's filosofie |
| `lsp.diagnosticsOnEdit` | Bestaat, default `false` | `lsp.diagnosticsMode` enum — explicieter |
| AST tools | `astGrep.enabled`, `astEdit.enabled` apart | `ast.enabled` master toggle + sub-toggles |
| Architectuur | Geïntegreerd in core | Feature module met registry pattern |
| Settings structuur | Monolithisch schema | Distributed providers (Registry pattern) |

### 7. Voordelen van dit Ontwerp

1. **Mario's filosofie behouden**: Default geen LSP/AST — gebruiker moet expliciet opt-in
2. **Configureerbaar**: Volledige controle via settings API
3. **Extensible**: Nieuwe code-intelligence features kunnen eenvoudig worden toegevoegd
4. **Consistent**: Gebruikt bestaande patterns (SettingsProvider, registry, bootstrap)
5. **Transparant**: Geen hidden behavior — alleen wat expliciet is ingeschakeld

---

## Gerelateerde Beads

- the-firm-7vj: Vergelijk /settings tabs met upstream oh-my-pi
- the-firm-p36: Dit issue — onderzoek en plan LSP/AST-integratie
