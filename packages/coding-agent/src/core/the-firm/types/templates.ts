import type { ContentType } from './content.js';

export interface TemplateSection {
  name: string;
  required: boolean;
  maxLines?: number;
  hint: string;
}

export interface Template {
  name: string;
  contentType: ContentType;
  sections: TemplateSection[];
  frontmatterSchema: Record<string, unknown>;
  mviLimits: {
    maxLines: number;
    maxDescription: number;
  };
}
