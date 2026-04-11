import type { Template } from "../types/index.js";

/**
 * Abstraction over template sources.
 * Implementations may load from hardcoded defaults or from the filesystem.
 */
export interface TemplateProvider {
  getTemplate(contentType: string): Promise<Template | null>;
  listTemplates(): Template[];
}
