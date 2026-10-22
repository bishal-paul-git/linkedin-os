import type {
  ApprovalAction,
  Capability,
  ExecutionResult,
  LinkedInAdapter,
} from "../../core/src/index.ts";
import { ZernioClient, type ZernioFetch } from "./client.ts";

export interface ZernioLinkedInAdapterOptions {
  tenantId: string;
  apiKey: string;
  personalAccountId?: string | null;
  pageAccountId?: string | null;
  fetchImpl?: ZernioFetch;
}

export class ZernioLinkedInAdapter implements LinkedInAdapter {
  readonly id = "zernio";
  readonly tenantId: string;
  private readonly client: ZernioClient;
  private readonly personalAccountId?: string | null;
  private readonly pageAccountId?: string | null;

  constructor(options: ZernioLinkedInAdapterOptions) {
    this.tenantId = options.tenantId;
    this.personalAccountId = options.personalAccountId;
    this.pageAccountId = options.pageAccountId;
    this.client = new ZernioClient(options.apiKey, options.fetchImpl);
  }

  async listCapabilities(): Promise<Capability[]> {
    const capabilities: Capability[] = [];
    if (this.personalAccountId) {
      capabilities.push({
        tenantId: this.tenantId,
        capability: "PUBLISH_MEMBER_POST",
        mode: "AVAILABLE_OFFICIAL",
        adapter: this.id,
        canExecute: true,
        requiresUserAction: false,
        health: "HEALTHY",
        reason: "LinkedIn personal publishing via Zernio.",
      });
    }
    if (this.pageAccountId) {
      capabilities.push({
        tenantId: this.tenantId,
        capability: "PUBLISH_PAGE_POST",
        mode: "AVAILABLE_OFFICIAL",
        adapter: this.id,
        canExecute: true,
        requiresUserAction: false,
        health: "HEALTHY",
        reason: "LinkedIn organization Page publishing via Zernio.",
      });
    }
    return capabilities;
  }

  async healthCheck(): Promise<{ ok: boolean; reason?: string }> {
    try {
      const accounts = await this.client.listAccounts();
      const connected = new Set(
        accounts
          .filter((a) => a.platform === "linkedin" && a.isActive !== false)
          .map((a) => a.id),
      );
      const configured = [this.personalAccountId, this.pageAccountId].filter(Boolean) as string[];
      if (!configured.length) return { ok: false, reason: "No LinkedIn Zernio account is configured." };
      const missing = configured.filter((id) => !connected.has(id));
      return missing.length
        ? { ok: false, reason: "One or more configured LinkedIn accounts are unavailable." }
        : { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "Zernio health check failed.",
      };
    }
  }

  async execute(action: ApprovalAction): Promise<ExecutionResult> {
    if (action.actionType !== "PUBLISH_POST" && action.actionType !== "PUBLISH_PAGE_POST") {
      return {
        ok: false,
        blocked: true,
        error: "Zernio adapter does not execute this LinkedIn action type.",
      };
    }

    const accountId = action.actionType === "PUBLISH_POST"
      ? this.personalAccountId
      : this.pageAccountId;

    if (!accountId) {
      return {
        ok: false,
        blocked: true,
        error: "No Zernio account is configured for this publishing target.",
      };
    }

    if (!action.draftContent?.trim()) {
      return { ok: false, error: "Approved post content is empty." };
    }

    try {
      const post = await this.client.createLinkedInPost({
        accountId,
        content: action.draftContent,
      });
      const target = post.platforms?.find((p) => p.platform === "linkedin");
      return {
        ok: true,
        externalId: post.id ?? target?.platformPostId,
        result: target?.platformPostUrl ?? "Published through Zernio.",
        metadata: {
          zernioPostId: post.id,
          platformPostId: target?.platformPostId,
          platformPostUrl: target?.platformPostUrl,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Zernio publishing failed.",
      };
    }
  }
}
