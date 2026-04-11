import type { ContentType, Template, TemplateSection } from "../types/index.js";
import type { TemplateProvider } from "./template-provider.js";

/**
 * Hardcoded templates for all 8 content types.
 * Sections and limits mirror the .firm/templates/*.md files shipped by ctx init.
 */
export class BuiltinTemplates implements TemplateProvider {
  private readonly templates: Map<string, Template>;

  constructor() {
    this.templates = new Map<string, Template>([
      ["decision", decisionTemplate()],
      ["concept", conceptTemplate()],
      ["pattern", patternTemplate()],
      ["guide", guideTemplate()],
      ["error", errorTemplate()],
      ["spec", specTemplate()],
      ["standard", standardTemplate()],
      ["rule", ruleTemplate()],
    ]);
  }

  getTemplate(contentType: string): Promise<Template | null> {
    return Promise.resolve(this.templates.get(contentType) ?? null);
  }

  listTemplates(): Template[] {
    return Array.from(this.templates.values());
  }
}

// ── Default MVI limits ────────────────────────────────────────────────────

const DEFAULT_MVI = {
  maxLines: 200,
  maxDescription: 120,
} as const;

// ── Section helpers ───────────────────────────────────────────────────────

function required(name: string, hint: string, maxLines?: number): TemplateSection {
  return { name, required: true, ...(maxLines !== undefined && { maxLines }), hint };
}

function optional(name: string, hint: string, maxLines?: number): TemplateSection {
  return { name, required: false, ...(maxLines !== undefined && { maxLines }), hint };
}

// ── Shared frontmatter schema ─────────────────────────────────────────────

const STANDARD_FRONTMATTER: Record<string, unknown> = {
  status: "string (active | draft | deprecated | archived)",
  description: "string (max 120 chars)",
  owner: "string",
  created: "date (YYYY-MM-DD)",
  updated: "date (YYYY-MM-DD)",
  "review-cadence": "string (e.g. quarterly, monthly, as-needed)",
};

// ── Per-type template factories ───────────────────────────────────────────

function decisionTemplate(): Template {
  return {
    name: "Decision",
    contentType: "decision" as ContentType,
    sections: [
      required("Context", "What is the problem or opportunity? What forces are at play?"),
      required("Decision", "What did we decide? Be specific."),
      required("Consequences", "Positive and negative outcomes of this decision."),
      optional("Alternatives Considered", "Options evaluated and why they were rejected."),
      optional("Related", "Links to related decisions, concepts, or patterns."),
    ],
    frontmatterSchema: { ...STANDARD_FRONTMATTER, status: "string (active | draft | superseded)" },
    mviLimits: { ...DEFAULT_MVI },
  };
}

function conceptTemplate(): Template {
  return {
    name: "Concept",
    contentType: "concept" as ContentType,
    sections: [
      required("Core Concept", "1-3 sentences explaining what this is and why it matters."),
      required("Key Points", "Critical points with brief explanations."),
      optional("When to Apply", "Situations where this concept applies or should be avoided."),
      optional("References", "Links to related decisions, patterns, or external resources."),
    ],
    frontmatterSchema: { ...STANDARD_FRONTMATTER },
    mviLimits: { ...DEFAULT_MVI },
  };
}

function patternTemplate(): Template {
  return {
    name: "Pattern",
    contentType: "pattern" as ContentType,
    sections: [
      required("Problem", "What problem does this pattern solve? Describe the concrete scenario."),
      required("Solution", "How the pattern works. Steps, structure, or approach."),
      required("When to Use", "Specific situations where this pattern applies."),
      optional("When NOT to Use", "Situations where this pattern would be wrong."),
      optional("Trade-offs", "Benefits vs costs in table form."),
      optional("Example", "Concrete code, config, or command example demonstrating the pattern."),
      optional("References", "Links to related patterns, decisions, or concepts."),
    ],
    frontmatterSchema: { ...STANDARD_FRONTMATTER },
    mviLimits: { ...DEFAULT_MVI },
  };
}

function guideTemplate(): Template {
  return {
    name: "Guide",
    contentType: "guide" as ContentType,
    sections: [
      required("When to Use", "Specific situations where this guide applies."),
      optional("Prerequisites", "Checklist of things needed before starting."),
      required("Steps", "Ordered steps with descriptions and examples."),
      optional("Verification", "How to confirm the guide was followed correctly."),
      optional("Troubleshooting", "Problem/Cause/Solution table for common issues."),
      optional("References", "Links to related concepts, decisions, or patterns."),
    ],
    frontmatterSchema: { ...STANDARD_FRONTMATTER },
    mviLimits: { ...DEFAULT_MVI },
  };
}

function errorTemplate(): Template {
  return {
    name: "Error",
    contentType: "error" as ContentType,
    sections: [
      required("Symptoms", "Observable signs that this error is occurring."),
      required("Root Cause", "Why this happens. The underlying mechanism."),
      optional("Detection", "How to recognize this error: triggers, log patterns, behavior."),
      required("Solution", "How to fix it. Step-by-step if needed."),
      optional("Prevention", "How to prevent it from recurring."),
      optional("References", "Links to related errors, patterns, or decisions."),
    ],
    frontmatterSchema: { ...STANDARD_FRONTMATTER },
    mviLimits: { ...DEFAULT_MVI },
  };
}

function specTemplate(): Template {
  return {
    name: "Spec",
    contentType: "spec" as ContentType,
    sections: [
      required("Purpose", "What this specification covers and why it exists."),
      required("Interface", "API surface: arguments, options, syntax."),
      required("Behavior", "Happy path and error cases with expected outcomes."),
      optional("Testing", "Test cases with commands and expected output."),
    ],
    frontmatterSchema: { ...STANDARD_FRONTMATTER, "review-cadence": "string (as-needed)" },
    mviLimits: { ...DEFAULT_MVI },
  };
}

function standardTemplate(): Template {
  return {
    name: "Standard",
    contentType: "standard" as ContentType,
    sections: [
      required("Rule", "The standard or convention being established."),
      required("Rationale", "Why this standard exists and what it prevents."),
      optional("Exceptions", "When it is acceptable to deviate from this standard."),
      optional("Enforcement", "How compliance is checked (linters, reviews, CI)."),
      optional("References", "Links to related decisions or patterns."),
    ],
    frontmatterSchema: { ...STANDARD_FRONTMATTER },
    mviLimits: { ...DEFAULT_MVI },
  };
}

function ruleTemplate(): Template {
  return {
    name: "Rule",
    contentType: "rule" as ContentType,
    sections: [
      required("Rule", "The rule or constraint being documented."),
      required("Rationale", "Why this rule exists and what it prevents."),
      optional("Exceptions", "When it is acceptable to break this rule."),
      optional("Examples", "Correct and incorrect usage examples."),
      optional("References", "Links to related standards, decisions, or patterns."),
    ],
    frontmatterSchema: { ...STANDARD_FRONTMATTER },
    mviLimits: { ...DEFAULT_MVI },
  };
}
