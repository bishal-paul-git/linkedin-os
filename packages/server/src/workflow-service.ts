import type { PlatformRepositories } from "./repositories";

export class WorkflowService {
  constructor(private readonly repos: PlatformRepositories) {}

  async start(input: {
    tenantId: string;
    workflowCode: string;
    triggerType?: "MANUAL" | "SCHEDULED" | "EVENT" | "SYSTEM";
    inputSummary?: string;
  }) {
    return this.repos.createWorkflowRun({
      tenantId: input.tenantId,
      workflowCode: input.workflowCode,
      triggerType: input.triggerType ?? "MANUAL",
      inputSummary: input.inputSummary,
    });
  }

  async finish(input: {
    tenantId: string;
    runId: string;
    status: "SUCCEEDED" | "PARTIAL" | "FAILED" | "BLOCKED" | "CANCELLED";
    outputSummary?: string;
    error?: string;
    stats?: Record<string, unknown>;
  }): Promise<void> {
    await this.repos.finishWorkflowRun(input);
  }
}
