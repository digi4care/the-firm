import type { ProjectScanner } from "../scanning/project-scanner.js";
import type { TemplateProvider } from "../template-engine/template-provider.js";
import type { Proposal, ToolInput, ToolResult, WriteOperation } from "../types/index.js";
import type { CompositeValidator } from "../validation/composite-validator.js";
import type { ContentBuilder } from "../writing/content-builder.js";
import type { FirmRepository } from "../writing/firm-repository.js";
import type { NavigationSync } from "../writing/navigation-sync.js";
import type { RulesRepository } from "../writing/rules-repository.js";
import type { ApprovalGate, ApprovalMode } from "./approval-gate.js";
import { PipelineContext } from "./pipeline-context.js";

/**
 * Abstract base class for all the-firm tools.
 *
 * Implements the Template Method pattern: the `execute` method defines the
 * pipeline skeleton (scan -> analyze -> buildProposals -> validate -> approve ->
 * write -> syncNavigation -> report), while subclasses provide the
 * tool-specific behavior for the first three stages.
 */
export abstract class KBToolBase<TInput extends ToolInput = ToolInput> {
  abstract readonly name: string;
  abstract readonly description: string;

  constructor(
    protected scanner: ProjectScanner,
    protected validator: CompositeValidator,
    protected firmRepo: FirmRepository,
    protected rulesRepo: RulesRepository,
    protected templates: TemplateProvider,
    protected approval: ApprovalGate,
    protected navSync: NavigationSync,
    protected contentBuilder: ContentBuilder,
  ) {}

  async execute(input: TInput, approvalMode: ApprovalMode = "dry-run"): Promise<ToolResult> {
    const context = new PipelineContext(input.projectRoot);

    try {
      await this.scan(input, context);
      await this.analyze(input, context);
      this.buildProposals(input, context);
      await this.validateProposals(context);
      await this.approveProposals(context, approvalMode);

      if (context.approvedProposals.length === 0) {
        return {
          status: context.proposals.length > 0 ? "proposals" : "empty",
          ...(context.proposals.length > 0 ? { items: context.proposals } : {}),
          message:
            context.proposals.length > 0
              ? `${context.proposals.length} proposals generated (awaiting approval)`
              : "No proposals generated",
        };
      }

      await this.write(context);
      await this.syncNavigation(context);
      return this.report(context);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // -- Abstract: subclasses must implement ---------------------------------

  protected abstract scan(input: TInput, context: PipelineContext): Promise<void>;
  protected abstract analyze(input: TInput, context: PipelineContext): Promise<void>;
  protected abstract buildProposals(input: TInput, context: PipelineContext): void;

  // -- Concrete: shared pipeline steps ------------------------------------

  /**
   * Run CompositeValidator on each proposal's content.
   * Validation errors are captured per-proposal but do NOT stop the pipeline.
   * The proposal's metadata.validationPassed flag is set accordingly.
   */
  protected async validateProposals(context: PipelineContext): Promise<void> {
    for (const proposal of context.proposals) {
      const template = await this.templates.getTemplate(proposal.metadata.contentType);
      if (!template) {
        proposal.metadata.validationPassed = false;
        proposal.metadata.validationErrors = [
          `No template found for content type: ${proposal.metadata.contentType}`,
        ];
        continue;
      }

      const result = this.validator.validate(proposal.content, template);

      if (!result.valid) {
        proposal.metadata.validationPassed = false;
        proposal.metadata.validationErrors = result.errors.map((e) => e.message);
      }
    }
  }

  /**
   * Filter proposals through the ApprovalGate based on mode.
   */
  protected async approveProposals(context: PipelineContext, mode: ApprovalMode): Promise<void> {
    context.approvedProposals = await this.approval.approve(context.proposals, mode);
  }

  /**
   * Write each approved proposal via FirmRepository with backup.
   * Delete proposals are handled via firmRepo.delete, others via writeWithBackup.
   */
  protected async write(context: PipelineContext): Promise<void> {
    const written: WriteOperation[] = [];
    const errors: string[] = [];

    for (const proposal of context.approvedProposals) {
      if (proposal.action === "delete") {
        await this.firmRepo.delete(proposal.targetPath);
        written.push({
          action: "delete",
          targetPath: proposal.targetPath,
        });
      } else {
        const op = await this.firmRepo.writeWithBackup(proposal.targetPath, proposal.content);
        written.push(op);
      }
    }

    context.writeResult = { written, navigationsUpdated: [], errors };
  }

  /**
   * Sync navigation.md files after writes.
   */
  protected async syncNavigation(context: PipelineContext): Promise<void> {
    const dirs = await this.navSync.syncAll(context.projectRoot);
    if (context.writeResult) {
      context.writeResult.navigationsUpdated = dirs;
    }
  }

  /**
   * Build the final ToolResult from pipeline state.
   */
  protected report(context: PipelineContext): ToolResult {
    return {
      status: "success",
      items: context.approvedProposals,
      message: `${context.writeResult?.written.length ?? 0} file(s) written`,
      metadata: {
        writtenFiles: context.writeResult?.written.map((w) => w.targetPath) ?? [],
        navigationDirs: context.writeResult?.navigationsUpdated ?? [],
      },
    };
  }
}
