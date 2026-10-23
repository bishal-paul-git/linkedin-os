import type {
  ApprovalAction,
  Capability,
  ExecutionResult,
  LinkedInAdapter,
} from "../../core/src/index.ts";
import {
  LinkedInOfficialClient,
  type LinkedInFetch,
  type LinkedInPublishTransport,
} from "./client.ts";

export interface LinkedInOfficialAdapterOptions {
  tenantId: string;
  accessToken?: string | null;
  memberAuthorUrn?: string | null;
  publishTransport?: LinkedInPublishTransport | null;
  linkedInVersion?: string | null;
  fetchImpl?: LinkedInFetch;
}

export class LinkedInOfficialAdapter implements LinkedInAdapter {
  readonly id = "linkedin-official";
  readonly tenantId: string;
  private readonly client: LinkedInOfficialClient;
  private readonly accessToken?: string | null;
  private readonly memberAuthorUrn?: string | null;
  private readonly publishTransport?: LinkedInPublishTransport | null;
  private readonly linkedInVersion?: string | null;

  constructor(options: LinkedInOfficialAdapterOptions) {
    this.tenantId = options.tenantId;
    this.accessToken = options.accessToken;
    this.memberAuthorUrn = options.memberAuthorUrn;
    this.publishTransport = options.publishTransport;
    this.linkedInVersion = options.linkedInVersion;
    this.client = new LinkedInOfficialClient(options.fetchImpl);
  }

  async listCapabilities(): Promise<Capability[]> {
    if (!this.accessToken || !this.memberAuthorUrn || !this.publishTransport) return [];
    if (this.publishTransport === "posts" && !this.linkedInVersion) return [];
    return [{
      tenantId: this.tenantId,
      capability: "PUBLISH_MEMBER_POST",
      mode: "AVAILABLE_OFFICIAL",
      adapter: this.id,
      canExecute: true,
      requiresUserAction: false,
      health: "HEALTHY",
      reason: "Direct member publishing through an explicitly configured LinkedIn self-service scope.",
    }];
  }

  async healthCheck(): Promise<{ ok: boolean; reason?: string }> {
    if (!this.accessToken) return { ok: false, reason: "LinkedIn access token is not configured." };
    try {
      const member = await this.client.getUserInfo(this.accessToken);
      return member.sub
        ? { ok: true }
        : { ok: false, reason: "LinkedIn userinfo response did not contain a subject." };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "LinkedIn health check failed.",
      };
    }
  }

  async execute(action: ApprovalAction): Promise<ExecutionResult> {
    if (action.actionType !== "PUBLISH_POST") {
      return {
        ok: false,
        blocked: true,
        error: "The self-service LinkedIn adapter only executes personal member posts.",
      };
    }
    if (!this.accessToken || !this.memberAuthorUrn || !this.publishTransport) {
      return {
        ok: false,
        blocked: true,
        error: "LinkedIn member publishing is not fully configured.",
      };
    }
    if (!action.draftContent?.trim()) return { ok: false, error: "Approved post content is empty." };

    try {
      const result = await this.client.publishTextPost({
        accessToken: this.accessToken,
        authorUrn: this.memberAuthorUrn,
        text: action.draftContent,
        transport: this.publishTransport,
        linkedInVersion: this.linkedInVersion ?? undefined,
      });
      return {
        ok: true,
        externalId: result.id,
        result: "Published directly through LinkedIn.",
        metadata: { transport: result.transport },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "LinkedIn publishing failed.",
      };
    }
  }
}
