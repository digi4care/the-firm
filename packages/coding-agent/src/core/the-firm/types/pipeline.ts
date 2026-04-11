import type { ContentType, ContentCategory } from './content.js';

export interface ToolInput {
  projectRoot: string;
  options?: Record<string, unknown>;
}

export interface ToolResult {
  status: 'success' | 'proposals' | 'empty' | 'error';
  items?: Proposal[];
  message: string;
  metadata?: Record<string, unknown>;
}

export interface Proposal {
  id: string;
  action: 'create' | 'update' | 'move' | 'delete' | 'compact';
  targetPath: string;
  content: string;
  metadata: ProposalMetadata;
  diff?: string;
}

export interface ProposalMetadata {
  contentType: ContentType;
  category: ContentCategory;
  template: string;
  validationPassed: boolean;
  validationErrors?: string[];
}
