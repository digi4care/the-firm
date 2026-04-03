---
name: kroki-diagram-api
description: "Generate diagrams from text via Kroki's unified HTTP API. Supports 20+ diagram formats (Mermaid, PlantUML, Graphviz, D2, etc.) rendered to SVG, PNG, or PDF. No auth required."
allowed-tools: Bash Read Write Edit
---

# Kroki Diagram API

Generate images from text-based diagram definitions via Kroki.
Single endpoint, 20+ diagram languages, output as SVG/PNG/PDF.
No authentication. Free public instance or self-hosted.

## When to Use Me

- User asks to generate a diagram from text (flowchart, sequence, architecture, network graph)
- User mentions Mermaid, PlantUML, Graphviz, D2, BPMN, or other diagram syntax
- User wants to render diagram source code into an image file
- User asks "how do I make a diagram from code/text?"
- User needs architecture diagrams, flowcharts, or pipeline visualizations programmatically
- User mentions Kroki specifically

## When NOT to Use Me

- User wants to edit an existing image — Kroki generates from text, not pixel editing
- User asks about rendering Mermaid in a browser/wiki — that's a client-side concern
- User wants interactive/dynamic diagrams — Kroki produces static images
- User asks about drawing tools (Figma, Excalidraw GUI) — this is text-to-image only
- **Decision test:** If the request is about converting text/source to a diagram image, trigger. If it's about visual editing, interactive charts, or UI design, do not trigger.

## Workflow

### 1. Choose diagram language

Pick the right language for the job. See `references/api-reference.md` § Supported Diagram Types.

Common choices:
- **Mermaid** — flowcharts, sequences, Gantt charts
- **Graphviz** — network graphs, DAGs, dependency trees
- **PlantUML** — UML, class diagrams, sequences
- **D2** — modern declarative diagrams

### 2. Write diagram source

Write the diagram in the chosen language syntax. Keep it simple — Kroki validates and renders.

### 3. Render via Kroki

**POST request (recommended):**

```bash
curl -X POST "https://kroki.io/{type}/{format}" \
  -H "Content-Type: text/plain" \
  -d '{diagram source}' -o output.svg
```

Replace `{type}` with the diagram keyword (e.g., `mermaid`, `graphviz`), `{format}` with the output format (`svg`, `png`, `pdf`).

See `references/api-reference.md` for full API details, Python usage, and all supported formats.

### 4. Save and deliver

Write the rendered image to the requested output path. Report the file path and format back to the user.

## Error Handling

| Situation | Response |
|-----------|----------|
| Kroki returns 400 | Diagram source has syntax errors. Read the error message, fix the syntax, retry. |
| Kroki returns 413 | Diagram source too large. Simplify the diagram or split into multiple. |
| Kroki unreachable (network error) | Check connectivity. If behind firewall, suggest self-hosting via Docker (`docker run -d -p 8000:8000 yuzutech/kroki`). |
| Unknown diagram type | Check `references/api-reference.md` § Supported Diagram Types for the correct keyword. |
| Output format not supported | Use SVG (default), PNG, or PDF. See `references/api-reference.md` § Output Formats. |
| User needs programmatic access | Use the Python helper in `references/api-reference.md` § Python Usage. |

## Quick Tests

### Should Trigger
- "Generate a flowchart diagram from this description"
- "Render this Mermaid code to SVG"
- "I need an architecture diagram for my system"
- "Convert this Graphviz DOT to an image"
- "Make a sequence diagram for this API flow"

### Should Not Trigger
- "Design a UI mockup for my app"
- "Edit this PNG image"
- "Create an interactive chart with D3"
- "What's the best diagramming tool?"

### Functional
- POST to `https://kroki.io/mermaid/svg` with valid Mermaid source returns SVG bytes
- Invalid diagram syntax returns HTTP 400 with error details
- Output file is valid SVG/PNG/PDF matching the requested format
- Self-hosted instance responds identically at `http://localhost:8000`

## References

| File | Contents |
|------|----------|
| `references/api-reference.md` | Full API docs: endpoints, curl examples, Python helpers, all diagram types, output formats, self-hosting |
