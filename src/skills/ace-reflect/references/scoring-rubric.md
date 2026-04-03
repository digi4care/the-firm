# ACE Scoring Rubric

Detailed criteria for session evaluation.

## Scoring Scale

| Score | Meaning |
|-------|---------|
| 5 | Excellent - Best practice |
| 4 | Good - Minor issues |
| 3 | Adequate - Some improvement needed |
| 2 | Below average - Significant issues |
| 1 | Poor - Major problems |

## Criteria Details

### Completeness (5 points)

| Score | Criteria |
|-------|----------|
| 5 | All tasks completed, edge cases handled |
| 4 | All main tasks done, minor gaps |
| 3 | Most tasks done, some missing |
| 2 | Incomplete, significant gaps |
| 1 | Major tasks not attempted |

### Accuracy (5 points)

| Score | Criteria |
|-------|----------|
| 5 | All solutions correct, no hallucinations |
| 4 | Mostly correct, minor errors |
| 3 | Generally correct with some mistakes |
| 2 | Several incorrect solutions |
| 1 | Major inaccuracies or hallucinations |

### Efficiency (5 points)

| Score | Criteria |
|-------|----------|
| 5 | Minimal iterations, optimal tool usage |
| 4 | Good efficiency, minor redundancy |
| 3 | Adequate, some unnecessary steps |
| 2 | Many redundant calls, poor planning |
| 1 | Excessive iterations, wasted effort |

### Clarity (5 points)

| Score | Criteria |
|-------|----------|
| 5 | Crystal clear, well-structured responses |
| 4 | Clear, minor organizational issues |
| 3 | Understandable, could be clearer |
| 2 | Often unclear, poor structure |
| 1 | Confusing, hard to follow |

### Relevance (5 points)

| Score | Criteria |
|-------|----------|
| 5 | All content directly relevant |
| 4 | Mostly relevant, minor tangents |
| 3 | Generally relevant with some drift |
| 2 | Frequent off-topic content |
| 1 | Major relevance issues |

## Decision Thresholds

| Score Range | Action |
|-------------|--------|
| 20-25 | No changes needed |
| 15-19 | Suggestions for review |
| 0-14 | Changes recommended |

## Common Patterns to Detect

### Efficiency Patterns

- **Redundant reads:** Same file read multiple times
- **Tool spam:** Many small tool calls instead of batched
- **Context bloat:** Not pruning/digesting when needed
- **Planning gaps:** Starting without clear plan

### Quality Patterns

- **Hallucination:** Stating non-existent facts
- **Over-engineering:** Complex solutions for simple problems
- **Under-planning:** Jumping to code without analysis
- **Missing validation:** Not testing or verifying solutions

### Communication Patterns

- **Verbose responses:** Too much explanation
- **Missing summaries:** Not summarizing at key points
- **Unclear structure:** No headers, lists, or organization
