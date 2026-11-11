import type {
  ApprovalAction,
  Capability,
  ExecutionResult,
  LinkedInAdapter,
} from "../../core/src/index.ts";
import { SwarmhitClient, SwarmhitApiError, type SwarmhitFetch } from "./client.ts";
import { RateBudget, type RateBudgetKind } from "./limits.ts";
import type { SwarmhitReactionType } from "./types.ts";

export const SWARMHIT_ADAPTER_ID = "swarmhit";

/**
 * Explicit tenant opt-in capabilities for SwarmHit.
 *
 * Defaults in linkedin-os stay AVAILABLE_ASSISTED until a tenant
 * explicitly opts in: call this when the tenant has connected a
 * SwarmHit sender and stored the API key (in Vault, later), and
 * register the returned rows in li_capabilities with mode
 * AVAILABLE_PROVIDER. Never register SwarmHit as AVAILABLE_OFFICIAL —
 * SwarmHit is not LinkedIn's official API.
 */
export function swarmhitProviderCapabilities(
  tenantId: string,
  accountId: string,
): Capability[] {
  const cap = (capability: string, reason: string): Capability => ({
    tenantId,
    capability,
    mode: "AVAILABLE_PROVIDER",
    adapter: SWARMHIT_ADAPTER_ID,
    canExecute: true,
    requiresUserAction: false,
    health: "HEALTHY",
    reason,
  });
  return [
    cap("SEND_CONNECTION", `LinkedIn connection invites via SwarmHit sender ${accountId}.`),
    cap("SEND_MESSAGE", `LinkedIn direct messages via SwarmHit sender ${accountId}.`),
    cap("WRITE_COMMENT", `LinkedIn post comments via SwarmHit sender ${accountId}.`),
    cap("WRITE_REACTION", `LinkedIn post reactions via SwarmHit sender ${accountId}.`),
    cap("READ_INBOX", `LinkedIn inbox reads via SwarmHit sender ${accountId}.`),
    cap("CHECK_CONNECTION_STATE", `LinkedIn connection-state checks via SwarmHit sender ${accountId}.`),
  ];
}

export interface SwarmhitLinkedInAdapterOptions {
  tenantId: string;
  apiKey: string;
  /** The one SwarmHit LinkedIn account id for this tenant (1 sender). */
  accountId: string;
  /** Whether that LinkedIn account has a premium plan (notes / InMail). */
  isPremium?: boolean;
  fetchImpl?: SwarmhitFetch;
  baseUrl?: string;
  workspaceId?: string | null;
  rateBudget?: RateBudget;
}

const ACTION_KIND: Partial<Record<ApprovalAction["actionType"], RateBudgetKind>> = {
  SEND_CONNECTION: "invite",
  SEND_DM: "message",
  REPLY_DM: "message",
  COMMENT: "post_comment",
  REACT: "post_like",
};

const REACTIONS: SwarmhitReactionType[] = ["like", "celebrate", "support", "love", "insightful", "funny"];

export class SwarmhitLinkedInAdapter implements LinkedInAdapter {
  readonly id = SWARMHIT_ADAPTER_ID;
  readonly tenantId: string;
  readonly accountId: string;
  private readonly client: SwarmhitClient;
  private readonly isPremium: boolean;
  private readonly rateBudget: RateBudget;

  constructor(options: SwarmhitLinkedInAdapterOptions) {
    if (!options.accountId) throw new Error("SwarmHit accountId is required.");
    this.tenantId = options.tenantId;
    this.accountId = options.accountId;
    this.isPremium = options.isPremium ?? false;
    this.rateBudget = options.rateBudget ?? new RateBudget();
    this.client = new SwarmhitClient({
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
      baseUrl: options.baseUrl,
      workspaceId: options.workspaceId ?? null,
    });
  }

  async listCapabilities(): Promise<Capability[]> {
    return swarmhitProviderCapabilities(this.tenantId, this.accountId);
  }

  async healthCheck(): Promise<{ ok: boolean; reason?: string }> {
    try {
      const account = await this.client.getAccount(this.accountId);
      if (account.paused) {
        return { ok: false, reason: `SwarmHit sender is paused${account.pausedReason ? `: ${account.pausedReason}` : "."}` };
      }
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "SwarmHit health check failed.",
      };
    }
  }

  private blocked(error: string): ExecutionResult {
    return { ok: false, blocked: true, error };
  }

  async execute(action: ApprovalAction): Promise<ExecutionResult> {
    if (action.approvalState !== "APPROVED") {
      return this.blocked("SwarmHit adapter only executes APPROVED actions.");
    }
    if (!action.idempotencyKey) {
      return this.blocked("Approval has no idempotency key; refusing to send without one.");
    }

    const kind = ACTION_KIND[action.actionType];
    if (kind) {
      const check = this.rateBudget.check(this.accountId, kind, { isPremium: this.isPremium });
      if (!check.allowed) {
        return {
          ok: false,
          blocked: true,
          error: check.reason ?? "Local rate budget exceeded.",
          metadata: { rateLimit: { limit: check.limit, used: check.used, resetAt: check.resetAt } },
        };
      }
    }

    try {
      switch (action.actionType) {
        case "SEND_CONNECTION": {
          if (!action.targetUrl) return this.blocked("SEND_CONNECTION needs a target LinkedIn profile URL.");
          const note = this.isPremium ? action.draftContent?.trim() || undefined : undefined;
          if (note !== undefined && note.length > 300) {
            return { ok: false, error: "Connection note must be at most 300 characters." };
          }
          const result = await this.client.sendConnection(
            this.accountId,
            { profileUrl: action.targetUrl, ...(note ? { note } : {}) },
            action.idempotencyKey,
          );
          if (kind) this.rateBudget.record(this.accountId, kind);
          return {
            ok: true,
            externalId: typeof result.id === "string" ? result.id : undefined,
            result: "Connection request sent through SwarmHit.",
            metadata: {
              adapter: this.id,
              accountId: this.accountId,
              profileUrl: action.targetUrl,
              noteSent: Boolean(note),
              noteDroppedFreeSender: !this.isPremium && Boolean(action.draftContent?.trim()),
              providerId: result.providerId ?? null,
            },
          };
        }
        case "SEND_DM": {
          if (!action.targetUrl) return this.blocked("SEND_DM needs a target LinkedIn profile URL.");
          if (!action.draftContent?.trim()) return { ok: false, error: "Approved DM text is empty." };
          const result = await this.client.sendDirectMessage(
            this.accountId,
            {
              profileUrl: action.targetUrl,
              text: action.draftContent,
              ...(action.targetRef ? { providerId: action.targetRef } : {}),
            },
            action.idempotencyKey,
          );
          if (kind) this.rateBudget.record(this.accountId, kind);
          return {
            ok: true,
            externalId: typeof result.id === "string" ? result.id : undefined,
            result: "Direct message sent through SwarmHit.",
            metadata: { adapter: this.id, accountId: this.accountId, profileUrl: action.targetUrl },
          };
        }
        case "REPLY_DM": {
          // targetRef carries the inbox chat id; targetUrl is the profile, for context.
          if (!action.targetRef) return this.blocked("REPLY_DM needs the inbox chat id (targetRef).");
          if (!action.draftContent?.trim()) return { ok: false, error: "Approved reply text is empty." };
          const result = await this.client.sendChatMessage(
            action.targetRef,
            { text: action.draftContent },
            action.idempotencyKey,
          );
          if (kind) this.rateBudget.record(this.accountId, kind);
          return {
            ok: true,
            externalId: result.messageId ?? undefined,
            result: "Inbox reply sent through SwarmHit.",
            metadata: { adapter: this.id, accountId: this.accountId, chatId: action.targetRef },
          };
        }
        case "COMMENT": {
          if (!action.targetUrl) return this.blocked("COMMENT needs a post URL or a profile URL.");
          if (!action.draftContent?.trim()) return { ok: false, error: "Approved comment text is empty." };
          const isPostUrl = /\/posts\/|\/feed\/update\//.test(action.targetUrl);
          const result = await this.client.commentPost(
            this.accountId,
            {
              ...(isPostUrl ? { postUrl: action.targetUrl } : { profileUrl: action.targetUrl }),
              text: action.draftContent,
            },
            action.idempotencyKey,
          );
          if (kind) this.rateBudget.record(this.accountId, kind);
          return {
            ok: true,
            externalId: typeof result.id === "string" ? result.id : undefined,
            result: "Comment posted through SwarmHit.",
            metadata: { adapter: this.id, accountId: this.accountId, targetUrl: action.targetUrl },
          };
        }
        case "REACT": {
          if (!action.targetUrl) return this.blocked("REACT needs a post URL or a profile URL.");
          const wanted = action.draftContent?.trim().toLowerCase();
          const reactionType: SwarmhitReactionType = REACTIONS.includes(wanted as SwarmhitReactionType)
            ? (wanted as SwarmhitReactionType)
            : "like";
          const isPostUrl = /\/posts\/|\/feed\/update\//.test(action.targetUrl);
          const result = await this.client.likePost(
            this.accountId,
            {
              ...(isPostUrl ? { postUrl: action.targetUrl } : { profileUrl: action.targetUrl }),
              reactionType,
            },
            action.idempotencyKey,
          );
          if (kind) this.rateBudget.record(this.accountId, kind);
          return {
            ok: true,
            externalId: typeof result.id === "string" ? result.id : undefined,
            result: `Reaction (${reactionType}) left through SwarmHit.`,
            metadata: { adapter: this.id, accountId: this.accountId, targetUrl: action.targetUrl, reactionType },
          };
        }
        default:
          return this.blocked(`SwarmHit adapter does not execute ${action.actionType}.`);
      }
    } catch (error) {
      if (error instanceof SwarmhitApiError && error.rateLimit && kind) {
        this.rateBudget.applyRateLimit(this.accountId, kind, error.rateLimit);
        return {
          ok: false,
          blocked: true,
          error: error.message,
          metadata: { rateLimit: error.rateLimit },
        };
      }
      return { ok: false, error: error instanceof Error ? error.message : "SwarmHit execution failed." };
    }
  }
}
