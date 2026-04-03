# Grill Interview Techniques

Reference for the `grill-me` skill. Contains question types, interview patterns, and anti-patterns.

---

## Question Types

### Dependency Questions
Resolve what must be decided before other decisions can be made.

- "Before we decide on X, what is your assumption about Y?"
- "Does this decision depend on [other decision], or can it stand alone?"
- "If we change [decision A], does this break [decision B]?"

### Boundary Questions
Find where a concept starts and stops.

- "What's the scope of this? Where does it end?"
- "Is [edge case] in scope or out of scope?"
- "When would this NOT apply?"

### Trade-off Questions
Surface implicit trade-offs the user hasn't considered.

- "You're optimizing for [X]. Are you willing to sacrifice [Y] for it?"
- "What's the downside of this approach?"
- "What happens when [assumption] turns out to be wrong?"

### Concrete Scenario Questions
Turn abstract plans into specific situations.

- "Walk me through what happens when [specific scenario]"
- "A user does [X], then [Y]. What should happen?"
- "What does the system do on day 1 vs day 100?"

### Assumption Surfacing
Make implicit assumptions explicit.

- "You're assuming [X] — is that guaranteed?"
- "What would need to be true for this to fail?"
- "What's the worst case if [assumption] is wrong?"

### Alternatives Questions
Check if the user has considered other options.

- "Have you considered [alternative]? Why did you reject it?"
- "What would [different approach] look like here?"
- "Is there a simpler version that solves 80% of the problem?"

---

## Interview Patterns

### The Funnel
Start broad, narrow down.

1. "What's the overall goal?"
2. "What are the main moving parts?"
3. For each part: "How does this work in detail?"
4. "What could go wrong here?"

### The Dependency Chain
Follow the chain of dependencies.

1. "What's the first decision we need to make?"
2. "Once we decide that, what does it unlock?"
3. "Does this create any new constraints?"
4. Repeat until chain is resolved.

### The Stress Test
Try to break the plan.

1. "What's the weakest point of this plan?"
2. "What would an adversarial user do?"
3. "What happens under [extreme load / zero budget / tight deadline]?"
4. "How would you recover if this fails?"

### The Comparison
Force explicit comparison between options.

1. "List the options for [decision]"
2. For each option: "What's the best case? Worst case?"
3. "Which trade-off are you most comfortable with?"
4. "What would change your mind?"

---

## Anti-Patterns (What NOT to Do)

| Anti-pattern | Why it's bad | What to do instead |
|---|---|---|
| Asking multiple questions at once | User answers one, others get lost | One question at a time |
| Leading questions ("Don't you think X?") | Biases the answer | Neutral: "What do you think about X?" |
| Jumping between branches | Loses thread, confuses user | Finish one branch before starting another |
| Asking questions you can answer yourself | Wastes time | Explore the codebase first |
| Repeating the same question differently | Frustrates user | Accept the answer, move on |
| Asking about implementation too early | Locks in details prematurely | Focus on intent and boundaries first |

---

## Decision Tree Tracking

When grilling a complex plan, maintain a mental (or written) decision tree:

```
Plan
├── Decision A (resolved: use PostgreSQL)
│   ├── Decision A.1 (resolved: connection pooling via PgBouncer)
│   └── Decision A.2 (open: schema migration strategy)
├── Decision B (open: caching layer)
│   ├── Option B.1: Redis
│   └── Option B.2: In-process cache
└── Decision C (blocked by B)
```

Update the tree as decisions are made. At the end, show the resolved tree to the user as a summary.

---

## Reading the User

Adjust interview style based on user signals:

| Signal | Interpretation | Adjustment |
|---|---|---|
| Short, confident answers | User knows their domain well | Push harder on edge cases |
| Long, uncertain answers | User is thinking out loud | Give space, ask clarifying questions |
| "I don't know" | Genuine uncertainty | Offer options, postpone if needed |
| Frustration / impatience | Too many questions | Summarize what's resolved, ask if they want to continue |
| "Good question" | You've hit something they hadn't considered | Dive deeper on this branch |
| Repeatedly changing the subject | Avoiding a difficult decision | Gently bring back: "Before we move on, I want to make sure we resolve X" |
