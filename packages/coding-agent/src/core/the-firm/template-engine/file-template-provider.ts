import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Template, TemplateSection } from "../types/index.js";
import { BuiltinTemplates } from "./builtin-templates.js";
import type { TemplateProvider } from "./template-provider.js";

const DEFAULT_MVI = {
  maxLines: 200,
  maxDescription: 120,
} as const;

const DEFAULT_FRONTMATTER_SCHEMA: Record<string, unknown> = {
  status: "string",
  description: "string",
  owner: "string",
  created: "date",
  updated: "date",
};

/**
 * Loads templates from .firm/templates/<type>-template.md files.
 * Falls back to BuiltinTemplates when a user-customized file is not found.
 */
export class FileTemplateProvider implements TemplateProvider {
  private readonly cache = new Map<string, Template | null>();
  private readonly builtin: BuiltinTemplates;

  constructor(
    private readonly firmRoot: string,
    fallback?: BuiltinTemplates,
  ) {
    this.builtin = fallback ?? new BuiltinTemplates();
  }

  async getTemplate(contentType: string): Promise<Template | null> {
    if (this.cache.has(contentType)) {
      return this.cache.get(contentType) ?? null;
    }

    const filePath = join(this.firmRoot, "templates", `${contentType}-template.md`);

    try {
      const content = await readFile(filePath, "utf-8");
      const template = parseUserTemplate(content, contentType);
      this.cache.set(contentType, template);
      return template;
    } catch {
      // File not found or unreadable — fall back to builtin
      const builtin = await this.builtin.getTemplate(contentType);
      if (builtin) {
        this.cache.set(contentType, builtin);
      }
      return builtin;
    }
  }

  listTemplates(): Template[] {
    // FileTemplateProvider.listTemplates returns builtins as the canonical set.
    // Individual getTemplate calls resolve per-type from disk.
    return this.builtin.listTemplates();
  }
}

/**
 * Parse a user-supplied template markdown file into a Template object.
 * Extracts section headings (## ...) as sections — all optional since user
 * templates may differ from builtin structure.
 */
function parseUserTemplate(content: string, contentType: string): Template {
  const sections: TemplateSection[] = [];

  // Match ## headings, skipping the nav footer
  const headingRegex = /^## (.+)$/gm;
  let match = headingRegex.exec(content);

  while (match !== null) {
    const heading = match[1].trim();
    // Skip navigation footers
    if (heading.toLowerCase().startsWith("navigation")) {
      match = headingRegex.exec(content);
      continue;
    }

    sections.push({
      name: heading,
      required: false,
      hint: `User-defined section: ${heading}`,
    });
    match = headingRegex.exec(content);
  }

  return {
    name: contentType.charAt(0).toUpperCase() + contentType.slice(1),
    contentType: contentType as Template["contentType"],
    sections:
      sections.length > 0
        ? sections
        : [{ name: "Body", required: false, hint: "Free-form content" }],
    frontmatterSchema: { ...DEFAULT_FRONTMATTER_SCHEMA },
    mviLimits: { ...DEFAULT_MVI },
  };
}
