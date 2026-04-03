# Shared Config Utility
# Sourced by other scripts - do not execute directly

# Config file name (scoped to avoid collisions)
CONFIG_FILE="openpi-mastery-config.json"

# Find shared directory with hierarchy: local -> global
get_shared_dir() {
  # 1. Check local project first
  if [[ -d ".pi/shared" ]]; then
    echo ".pi/shared"
    return 0
  fi
  
  # 2. Check global
  if [[ -d "$HOME/.pi/agent/shared" ]]; then
    echo "$HOME/.pi/agent/shared"
    return 0
  fi
  
  # 3. Check if we're in the src directory (development)
  local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -f "$script_dir/config.sh" ]]; then
    echo "$script_dir"
    return 0
  fi
  
  return 1
}

# Find config file with hierarchy: local -> global -> none
get_config_path() {
  # 1. Check local project first
  if [[ -f ".ai_docs/$CONFIG_FILE" ]]; then
    echo ".ai_docs/$CONFIG_FILE"
    return 0
  fi
  
  # 2. Check global
  if [[ -f "$HOME/.ai_docs/$CONFIG_FILE" ]]; then
    echo "$HOME/.ai_docs/$CONFIG_FILE"
    return 0
  fi
  
  # 3. No config found
  return 1
}

# Get ai_docs path from config or default
get_ai_docs_path() {
  local config_path
  config_path=$(get_config_path)
  
  if [[ -n "$config_path" ]]; then
    local ai_docs
    ai_docs=$(jq -r '.paths.aiDocs // empty' "$config_path" 2>/dev/null)
    if [[ -n "$ai_docs" ]]; then
      # Expand ~/
      echo "${ai_docs/#\~/$HOME}"
      return 0
    fi
  fi
  
  # Default: check local first, then global
  if [[ -d ".ai_docs" ]]; then
    echo ".ai_docs"
  else
    echo "$HOME/.ai_docs"
  fi
}

# Get package cache path
get_package_cache_path() {
  local ai_docs
  ai_docs=$(get_ai_docs_path)
  echo "$ai_docs/package-cache"
}

# Check if config exists
config_exists() {
  get_config_path > /dev/null 2>&1
}

# Create default config
create_config() {
  local scope="${1:-global}"
  local ai_docs_path
  
  if [[ "$scope" == "local" ]]; then
    ai_docs_path=".ai_docs"
  else
    ai_docs_path="$HOME/.ai_docs"
  fi
  
  mkdir -p "$ai_docs_path"
  
  cat > "$ai_docs_path/$CONFIG_FILE" << EOF
{
  "version": "1.0",
  "scope": "$scope",
  "lastUpdated": "$(date -Iseconds)",
  "paths": {
    "aiDocs": "$ai_docs_path",
    "packageCache": "$ai_docs_path/package-cache"
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
  
  echo "$ai_docs_path/$CONFIG_FILE"
}

# Update config with new data
update_config() {
  local key="$1"
  local value="$2"
  local config_path
  config_path=$(get_config_path)
  
  if [[ -z "$config_path" ]]; then
    echo "Error: No config file found" >&2
    return 1
  fi
  
  # Use jq to update
  local tmp_file=$(mktemp)
  jq "$key = $value" "$config_path" > "$tmp_file" && mv "$tmp_file" "$config_path"
  
  # Update lastUpdated timestamp
  jq '.lastUpdated = "'$(date -Iseconds)'"' "$config_path" > "$tmp_file" && mv "$tmp_file" "$config_path"
}

# Get config value
get_config_value() {
  local key="$1"
  local config_path
  config_path=$(get_config_path)
  
  if [[ -n "$config_path" ]]; then
    jq -r "$key // empty" "$config_path" 2>/dev/null
  fi
}

# Check if package is cached
is_package_cached() {
  local package_name="$1"
  local cached
  cached=$(get_config_value ".cache.packages[\"$package_name\"].cached")
  [[ "$cached" == "true" ]]
}

# Get cached package path
get_cached_package_path() {
  local package_name="$1"
  local cache_path
  cache_path=$(get_package_cache_path)
  echo "$cache_path/$package_name"
}
