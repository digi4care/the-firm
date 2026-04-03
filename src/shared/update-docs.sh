#!/bin/bash
# Update all Pi documentation from GitHub and generate knowledge base
#
# Usage:
#   ./update-docs.sh          # Interactive prompt
#   ./update-docs.sh --local  # Save to .ai_docs/ in current directory
#   ./update-docs.sh --global # Save to ~/.ai_docs/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Config is in the same directory (shared/)
source "$SCRIPT_DIR/config.sh"

LOCAL_DOCS=".ai_docs"
GLOBAL_DOCS="$HOME/.ai_docs"
DOCS_DIR=""
SCOPE=""

# Parse arguments or prompt
if [[ "$1" == "--local" ]]; then
    DOCS_DIR="$LOCAL_DOCS"
    SCOPE="local"
elif [[ "$1" == "--global" ]]; then
    DOCS_DIR="$GLOBAL_DOCS"
    SCOPE="global"
elif [[ -n "$1" ]]; then
    echo "Usage: $0 [--local|--global]"
    echo "  No args  - Interactive prompt"
    echo "  --local  - Save to .ai_docs/ in current directory"
    echo "  --global - Save to ~/.ai_docs/"
    exit 1
else
    # Interactive prompt
    echo "Where should Pi documentation be saved?"
    echo ""
    echo "  1) Local  - .ai_docs/ (current project)"
    echo "  2) Global - ~/.ai_docs/ (all projects)"
    echo ""
    read -p "Choice [1/2]: " choice
    
    case $choice in
        1|l|local)
            DOCS_DIR="$LOCAL_DOCS"
            SCOPE="local"
            ;;
        2|g|global|*)
            DOCS_DIR="$GLOBAL_DOCS"
            SCOPE="global"
            ;;
    esac
fi

# Resolve to absolute path
DOCS_DIR="$(cd "$(dirname "$DOCS_DIR")" 2>/dev/null && pwd)/$(basename "$DOCS_DIR")" 2>/dev/null || DOCS_DIR="$(pwd)/$DOCS_DIR"

# Create/update config file
if [[ "$SCOPE" == "local" ]]; then
    mkdir -p ".ai_docs"
    CONFIG_FILE=".ai_docs/$CONFIG_FILE"
else
    mkdir -p "$HOME/.ai_docs"
    CONFIG_FILE="$HOME/.ai_docs/$CONFIG_FILE"
fi

# Create config if not exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    cat > "$CONFIG_FILE" << EOF
{
  "version": "1.0",
  "scope": "$SCOPE",
  "lastUpdated": "$(date -Iseconds)",
  "paths": {
    "aiDocs": "$DOCS_DIR",
    "packageCache": "$DOCS_DIR/package-cache"
  },
  "cache": {
    "docs": {
      "github": null,
      "npm": null
    },
    "packages": {}
  },
  "settings": {
    "autoCachePackages": true,
    "cacheRepoInfo": true
  }
}
EOF
fi

# Create docs directory structure
mkdir -p "$DOCS_DIR"/{packages,coding-agent/{docs,examples/extensions},mom/docs,pods/docs}

echo ""
echo "=== Fetching Pi documentation from GitHub ==="
echo "Target: $DOCS_DIR"
echo ""

# Function to fetch a file from GitHub
fetch_file() {
    local path="$1"
    local output="$2"

    gh api "repos/badlogic/pi-mono/contents/$path" --jq '.content' 2>/dev/null | base64 -d > "$output" 2>/dev/null || {
        echo "    Warning: Could not fetch $path"
        return 1
    }
    return 0
}

# Function to fetch directory listing and all files
fetch_docs_dir() {
    local pkg="$1"
    local output_dir="$2"

    echo "  Listing: packages/$pkg/docs"

    local files
    files=$(gh api "repos/badlogic/pi-mono/contents/packages/$pkg/docs" --jq '.[].name' 2>/dev/null) || {
        echo "    No docs directory"
        return
    }

    mkdir -p "$output_dir"

    for file in $files; do
        if [[ "$file" != "images" ]]; then
            echo "    $file"
            fetch_file "packages/$pkg/docs/$file" "$output_dir/$file"
        fi
    done
}

# Function to fetch extension examples
fetch_examples() {
    local output_dir="$DOCS_DIR/coding-agent/examples"

    echo "  Fetching examples..."

    mkdir -p "$output_dir/extensions"
    mkdir -p "$output_dir/sdk"

    # Get examples README
    fetch_file "packages/coding-agent/examples/README.md" "$output_dir/README.md"
    echo "    examples/README.md"

    # Get rpc-extension-ui.ts
    fetch_file "packages/coding-agent/examples/rpc-extension-ui.ts" "$output_dir/rpc-extension-ui.ts" 2>/dev/null && echo "    rpc-extension-ui.ts" || true

    # Get SDK examples
    local sdk_files
    sdk_files=$(gh api "repos/badlogic/pi-mono/contents/packages/coding-agent/examples/sdk" --jq '.[].name' 2>/dev/null) || true
    for file in $sdk_files; do
        fetch_file "packages/coding-agent/examples/sdk/$file" "$output_dir/sdk/$file" 2>/dev/null && echo "    sdk/$file" || true
    done

    # Get all extension examples
    local ext_dirs
    ext_dirs=$(gh api "repos/badlogic/pi-mono/contents/packages/coding-agent/examples/extensions" --jq '.[].name' 2>/dev/null) || true

    local count=0
    for dir in $ext_dirs; do
        # Check if it's a directory (has files) or a single file
        local is_dir
        is_dir=$(gh api "repos/badlogic/pi-mono/contents/packages/coding-agent/examples/extensions/$dir" --jq 'if type == "array" then "dir" else "file" end' 2>/dev/null) || continue
        
        if [[ "$is_dir" == "dir" ]]; then
            mkdir -p "$output_dir/extensions/$dir"
            # Get all files in the directory
            local files
            files=$(gh api "repos/badlogic/pi-mono/contents/packages/coding-agent/examples/extensions/$dir" --jq '.[].name' 2>/dev/null) || true
            for file in $files; do
                fetch_file "packages/coding-agent/examples/extensions/$dir/$file" "$output_dir/extensions/$dir/$file" 2>/dev/null && ((count++)) || true
            done
        else
            # Single file
            fetch_file "packages/coding-agent/examples/extensions/$dir" "$output_dir/extensions/$dir" 2>/dev/null && ((count++)) || true
        fi
        echo "    extensions/$dir"
    done

    echo "    Fetched $count extension files + SDK examples"
}

echo "=== Package READMEs ==="

for pkg in agent ai coding-agent mom pods tui web-ui; do
    echo "  packages/$pkg/README.md"
    fetch_file "packages/$pkg/README.md" "$DOCS_DIR/packages/$pkg.md" || true
done

echo ""
echo "=== Coding Agent Docs ==="
fetch_docs_dir "coding-agent" "$DOCS_DIR/coding-agent/docs"

echo ""
echo "=== Coding Agent Examples ==="
fetch_examples

echo ""
echo "=== Mom Docs ==="
fetch_docs_dir "mom" "$DOCS_DIR/mom/docs"

echo ""
echo "=== Pods Docs ==="
fetch_docs_dir "pods" "$DOCS_DIR/pods/docs"

echo ""
echo "=== Root Files ==="
echo "  README.md"
fetch_file "README.md" "$DOCS_DIR/ROOT-README.md"
echo "  CONTRIBUTING.md"
fetch_file "CONTRIBUTING.md" "$DOCS_DIR/CONTRIBUTING.md" || true

echo ""
echo "=== Generating Knowledge Base ==="

# Determine scope label
if [[ "$DOCS_DIR" == *"$HOME/.ai_docs"* ]]; then
    SCOPE="global"
else
    SCOPE="local"
fi

# Create master knowledge base index
cat > "$DOCS_DIR/KNOWLEDGE_BASE.md" << 'HEADER'
# Pi Knowledge Base

Complete documentation for Pi Coding Agent ecosystem.

**Scope:** SCOPE_PLACEHOLDER
**Last updated:** DATE_PLACEHOLDER
**Total files:** FILES_PLACEHOLDER

---

## Quick Navigation

| Topic | Location | Description |
|-------|----------|-------------|
| Extensions API | [coding-agent/docs/extensions.md](coding-agent/docs/extensions.md) | Full extension API reference |
| TUI Components | [coding-agent/docs/tui.md](coding-agent/docs/tui.md) | Terminal UI components |
| Core Packages | [packages/](packages/) | All @mariozechner/pi-* packages |
| Examples | [coding-agent/examples/](coding-agent/examples/) | Working code examples |
| NPM Ecosystem | Use `./update-ecosystem.sh` to fetch 343 packages | Community packages |

---

## Core Packages

| Package | README | Description |
|---------|--------|-------------|
| pi-agent-core | [agent.md](packages/agent.md) | Stateful agent with tool execution |
| pi-ai | [ai.md](packages/ai.md) | Unified LLM API with providers |
| pi-coding-agent | [coding-agent.md](packages/coding-agent.md) | Main CLI + extension API |
| pi-tui | [tui.md](packages/tui.md) | Terminal UI framework |
| pi-mom | [mom.md](packages/mom.md) | Slack bot powered by LLM |
| pi-pods | [pods.md](packages/pods.md) | Deploy LLMs on GPU pods |
| pi-web-ui | [web-ui.md](packages/web-ui.md) | Web UI components |

---

## Extension Development

### Documentation

| Doc | Description |
|-----|-------------|
| [extensions.md](coding-agent/docs/extensions.md) | **START HERE** - Full API reference |
| [tui.md](coding-agent/docs/tui.md) | TUI components for custom UI |
| [skills.md](coding-agent/docs/skills.md) | Create skills for Pi |
| [packages.md](coding-agent/docs/packages.md) | Share via npm/git |
| [themes.md](coding-agent/docs/themes.md) | Custom color schemes |
| [keybindings.md](coding-agent/docs/keybindings.md) | Keyboard shortcuts |

### Examples

| Location | Description |
|----------|-------------|
| [examples/extensions/](coding-agent/examples/extensions/) | 65+ extension examples |
| [examples/sdk/](coding-agent/examples/sdk/) | 13 SDK integration examples |
| [examples/rpc-extension-ui.ts](coding-agent/examples/rpc-extension-ui.ts) | RPC with custom UI |

#### Extension Examples (coding-agent/examples/extensions/)

| Category | Examples |
|----------|----------|
| **Tools** | hello.ts, question.ts, todo.ts, truncated-tool.ts |
| **Commands** | pirate.ts, summarize.ts, handoff.ts, preset.ts |
| **Events** | permission-gate.ts, protected-paths.ts, dirty-repo-guard.ts |
| **UI** | status-line.ts, custom-footer.ts, modal-editor.ts |
| **Games** | snake.ts, space-invaders.ts |
| **Remote** | ssh.ts, sandbox/, subagent/ |

#### SDK Examples (coding-agent/examples/sdk/)

| Example | Description |
|---------|-------------|
| 01-minimal.ts | Minimal SDK usage |
| 02-custom-model.ts | Custom model configuration |
| 03-custom-prompt.ts | Custom prompts |
| 04-skills.ts | Load skills |
| 05-tools.ts | Custom tools |
| 06-extensions.ts | Load extensions |
| 07-context-files.ts | AGENTS.md context |
| 08-prompt-templates.ts | Templates |
| 09-api-keys-and-oauth.ts | Authentication |
| 10-settings.ts | Settings management |
| 11-sessions.ts | Session handling |
| 12-full-control.ts | Complete example |

---

## Providers & Models

| Doc | Description |
|-----|-------------|
| [providers.md](coding-agent/docs/providers.md) | Provider setup guide |
| [models.md](coding-agent/docs/models.md) | Model configuration |
| [custom-provider.md](coding-agent/docs/custom-provider.md) | Add custom providers |

### Supported Providers

Subscriptions: Anthropic Claude Pro/Max, OpenAI ChatGPT Plus/Pro, GitHub Copilot, Google Gemini CLI, Google Antigravity

API Keys: Anthropic, OpenAI, Azure OpenAI, Google Gemini, Vertex AI, Amazon Bedrock, Mistral, Groq, Cerebras, xAI, OpenRouter, Vercel AI Gateway, MiniMax, Kimi, Hugging Face

---

## Session Management

| Doc | Description |
|-----|-------------|
| [session.md](coding-agent/docs/session.md) | Session file format and API |
| [tree.md](coding-agent/docs/tree.md) | Navigate session history |
| [compaction.md](coding-agent/docs/compaction.md) | Context management |

---

## Integration

| Doc | Description |
|-----|-------------|
| [sdk.md](coding-agent/docs/sdk.md) | Embed Pi in your app |
| [rpc.md](coding-agent/docs/rpc.md) | RPC protocol for integrations |
| [json.md](coding-agent/docs/json.md) | JSON event stream mode |

---

## Settings & Configuration

| Doc | Description |
|-----|-------------|
| [settings.md](coding-agent/docs/settings.md) | All settings options |
| [keybindings.md](coding-agent/docs/keybindings.md) | Keyboard customization |
| [themes.md](coding-agent/docs/themes.md) | Color themes |

---

## Platform Specific

| Doc | Description |
|-----|-------------|
| [windows.md](coding-agent/docs/windows.md) | Windows setup |
| [termux.md](coding-agent/docs/termux.md) | Android/Termux |
| [terminal-setup.md](coding-agent/docs/terminal-setup.md) | Terminal configuration |

---

## Other Packages

### pi-mom (Slack Bot)

| Doc | Description |
|-----|-------------|
| [slack-bot-minimal-guide.md](mom/docs/slack-bot-minimal-guide.md) | Slack integration |
| [sandbox.md](mom/docs/sandbox.md) | Docker sandboxing |
| [artifacts-server.md](mom/docs/artifacts-server.md) | Share visualizations |
| [events.md](mom/docs/events.md) | Schedule tasks |

### pi-pods (GPU Deployments)

| Doc | Description |
|-----|-------------|
| [models.md](pods/docs/models.md) | Available models |
| [gpt-oss.md](pods/docs/gpt-oss.md) | GPT-OSS models |
| [qwen3-coder.md](pods/docs/qwen3-coder.md) | Qwen3 Coder |

---

## GitHub Repository

- **Main repo**: https://github.com/badlogic/pi-mono
- **Issues**: https://github.com/badlogic/pi-mono/issues
- **Discord**: https://discord.com/invite/3cU7Bz4UPx

---

## Update This Knowledge Base

```bash
# From pi-encyclopedia skill directory
./scripts/update-docs.sh --global  # ~/.ai_docs/
./scripts/update-docs.sh --local   # .ai_docs/

# Update npm ecosystem (343 packages)
./scripts/update-ecosystem.sh
```
HEADER

# Update placeholders
FILE_COUNT=$(find "$DOCS_DIR" -name "*.md" | wc -l)
sed -i "s/SCOPE_PLACEHOLDER/$SCOPE/" "$DOCS_DIR/KNOWLEDGE_BASE.md"
sed -i "s/DATE_PLACEHOLDER/$(date +%Y-%m-%d)/" "$DOCS_DIR/KNOWLEDGE_BASE.md"
sed -i "s/FILES_PLACEHOLDER/$FILE_COUNT/" "$DOCS_DIR/KNOWLEDGE_BASE.md"

# Create simple INDEX.md for quick access
cat > "$DOCS_DIR/INDEX.md" << EOF
# Pi Documentation Index

**Scope:** $SCOPE | **Updated:** $(date +%Y-%m-%d) | **Files:** $FILE_COUNT

## Start Here
- **[KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md)** - Complete navigation guide
- **[packages/coding-agent.md](packages/coding-agent.md)** - Main CLI + extensions

## Key Docs
- [extensions.md](coding-agent/docs/extensions.md) - Extension API
- [tui.md](coding-agent/docs/tui.md) - TUI components
- [providers.md](coding-agent/docs/providers.md) - Provider setup
- [examples/](coding-agent/examples/) - Code examples

## Update
\`\`\`bash
./scripts/update-docs.sh --global
\`\`\`
EOF

echo "  Created KNOWLEDGE_BASE.md"
echo "  Created INDEX.md"

# Update config with fetch info
if [[ -f "$CONFIG_FILE" ]]; then
  TMP_FILE=$(mktemp)
  jq --arg scope "$SCOPE" \
     --arg docs "$DOCS_DIR" \
     --arg date "$(date -Iseconds)" \
     --argjson files "$FILE_COUNT" \
     '.lastUpdated = $date | 
      .scope = $scope |
      .paths.aiDocs = $docs |
      .paths.packageCache = ($docs + "/package-cache") |
      .cache.docs.github = {fetchedAt: $date, files: $files}' \
     "$CONFIG_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$CONFIG_FILE"
  echo "  Updated config: $CONFIG_FILE"
fi

echo ""
echo "=== Summary ==="
echo "Documentation saved to: $DOCS_DIR"
echo "Config: $CONFIG_FILE"
echo "Scope: $SCOPE"
echo "Files: $FILE_COUNT markdown files"
echo ""
echo "=== Done ==="
echo ""
echo "View: cat $DOCS_DIR/KNOWLEDGE_BASE.md"
