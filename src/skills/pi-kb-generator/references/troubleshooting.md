# Troubleshooting

## Common Issues

### "Knowledge base missing"

**Symptom:** `/skill:pi-encyclopedia` reports missing KNOWLEDGE_BASE.md

**Solution:**

```bash
/skill:pi-kb-generator
# Or directly:
.pi/shared/update-all.sh --global
```

### "gh CLI not authenticated"

**Symptom:** GitHub API returns 401

**Solution:**

```bash
gh auth login
gh auth status
```

### "npm rate limited"

**Symptom:** npm registry returns 429

**Solution:** Wait 1 minute, retry. The script handles pagination automatically.

### "Permission denied"

**Symptom:** Cannot write to ~/.ai_docs/

**Solution:**

```bash
chmod 755 ~/.ai_docs
# Or recreate:
rm -rf ~/.ai_docs
./src/install.sh --global
.pi/shared/update-all.sh --global
```

### "Partial fetch / incomplete docs"

**Symptom:** Some files missing

**Solution:** Re-run the update. Scripts are idempotent - safe to re-run.

### "Config not found"

**Symptom:** get_config_path returns nothing

**Solution:**

```bash
# Check installation
ls .pi/shared/config.sh
ls ~/.pi/agent/shared/config.sh

# Reinstall if needed
./src/install.sh --local   # or --global
```

### "jq: command not found"

**Symptom:** JSON parsing fails

**Solution:**

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq

# Arch
sudo pacman -S jq
```

## Debug Mode

Set environment variable for verbose output:

```bash
DEBUG=1 .pi/shared/update-docs.sh --global
```

## Validation

Check knowledge base integrity:

```bash
# Check files exist
ls ~/.ai_docs/KNOWLEDGE_BASE.md
ls ~/.ai_docs/npm-ecosystem.md
ls ~/.ai_docs/openpi-mastery-config.json

# Check doc count
find ~/.ai_docs -name "*.md" | wc -l  # Should be ~56

# Check package count in ecosystem
grep -c "^| \[" ~/.ai_docs/npm-ecosystem.md  # Should be ~343
```
