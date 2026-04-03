# Kroki API Reference

Kroki provides a unified HTTP API to render 20+ text-based diagram formats into images (SVG, PNG, PDF). It supports Mermaid, PlantUML, Graphviz, D2, BPMN, and more — all through a single endpoint. Self-hostable or use the free public instance. No authentication required.

## URL Format

```
https://kroki.io/{diagram_type}/{output_format}/{encoded_source}

# Or POST to:
https://kroki.io/{diagram_type}/{output_format}
```

## GET Request (URL-encoded)

```bash
# Graphviz DOT diagram
curl "https://kroki.io/graphviz/svg/digraph{A->B->C}" -o diagram.svg

# Mermaid diagram (base64-encoded)
echo "graph TD; A-->B; B-->C;" | base64 | \
  curl "https://kroki.io/mermaid/svg/$(cat -)" -o diagram.svg
```

## POST Request (Recommended)

```bash
# PlantUML sequence diagram
curl -X POST "https://kroki.io/plantuml/svg" \
  -H "Content-Type: text/plain" \
  -d '@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi!
@enduml' -o sequence.svg

# Mermaid flowchart
curl -X POST "https://kroki.io/mermaid/svg" \
  -H "Content-Type: text/plain" \
  -d 'graph TD
    A[Data Collection] --> B[Preprocessing]
    B --> C[Model Training]
    C --> D[Evaluation]
    D -->|Good| E[Deploy]
    D -->|Bad| B' -o flowchart.svg

# Graphviz
curl -X POST "https://kroki.io/graphviz/svg" \
  -H "Content-Type: text/plain" \
  -d 'digraph {
    rankdir=LR
    "Raw Data" -> "Feature Extraction" -> "Model" -> "Prediction"
  }' -o pipeline.svg

# D2 diagram
curl -X POST "https://kroki.io/d2/svg" \
  -H "Content-Type: text/plain" \
  -d 'Client -> API: Request
API -> Database: Query
Database -> API: Results
API -> Client: Response' -o d2.svg
```

## Python Usage

```python
import requests

KROKI_URL = "https://kroki.io"


def render_diagram(source: str, diagram_type: str = "mermaid",
                   output_format: str = "svg") -> bytes:
    """Render a text diagram to image via Kroki."""
    resp = requests.post(
        f"{KROKI_URL}/{diagram_type}/{output_format}",
        headers={"Content-Type": "text/plain"},
        data=source,
    )
    resp.raise_for_status()
    return resp.content


def save_diagram(source: str, output_path: str,
                 diagram_type: str = "mermaid",
                 output_format: str = "svg"):
    """Render and save a diagram to file."""
    content = render_diagram(source, diagram_type, output_format)
    with open(output_path, "wb") as f:
        f.write(content)
```

## Supported Diagram Types

| Type | Keyword | Best for |
|------|---------|----------|
| Mermaid | `mermaid` | Flowcharts, sequences, Gantt |
| PlantUML | `plantuml` | UML, sequences, class diagrams |
| Graphviz | `graphviz` | Network graphs, DAGs |
| D2 | `d2` | Modern text-to-diagram |
| Ditaa | `ditaa` | ASCII art diagrams |
| BlockDiag | `blockdiag` | Block diagrams |
| Nomnoml | `nomnoml` | UML-like diagrams |
| WaveDrom | `wavedrom` | Digital timing diagrams |
| Vega | `vega` | Data visualizations |
| Vega-Lite | `vegalite` | Simplified data viz |
| C4 PlantUML | `c4plantuml` | C4 architecture |
| BPMN | `bpmn` | Business processes |
| Bytefield | `bytefield` | Protocol/byte diagrams |
| Excalidraw | `excalidraw` | Hand-drawn style |

## Output Formats

| Format | Extension | Use case |
|--------|-----------|----------|
| SVG | `/svg` | Web, scalable |
| PNG | `/png` | Documents, slides |
| PDF | `/pdf` | Papers, print |
| JPEG | `/jpeg` | Compatibility |

## Self-Hosting

```bash
# Run Kroki locally via Docker
docker run -d -p 8000:8000 yuzutech/kroki

# Then use http://localhost:8000 instead of https://kroki.io
```
