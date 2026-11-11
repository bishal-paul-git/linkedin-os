import type {
  SwarmhitAccount,
  SwarmhitApiInfo,
  SwarmhitCampaign,
  SwarmhitCampaignInput,
  SwarmhitChat,
  SwarmhitChatMessage,
  SwarmhitConnection,
  SwarmhitDbPerson,
  SwarmhitDbPersonDetail,
  SwarmhitLead,
  SwarmhitLeadImport,
  SwarmhitLeadImportInput,
  SwarmhitOutreachAction,
  SwarmhitPagedResult,
  SwarmhitPendingComment,
  SwarmhitRateLimit,
  SwarmhitReactionType,
} from "./types.ts";

export const SWARMHIT_BASE_URL = "https://app.swarmhit.com/api/v1";

export interface SwarmhitHttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type SwarmhitFetch = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<SwarmhitHttpResponse>;

export class SwarmhitApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  /** Populated on 429 when SwarmHit returns { limit, used, scope, resetAt }. */
  readonly rateLimit?: SwarmhitRateLimit;

  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "SwarmhitApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    if (status === 429 && details) {
      const limit = details["limit"];
      const used = details["used"];
      const scope = details["scope"];
      if (typeof limit === "number" && typeof used === "number" && typeof scope === "string") {
        this.rateLimit = {
          limit,
          used,
          scope,
          resetAt: typeof details["resetAt"] === "string" ? details["resetAt"] : null,
          balance: typeof details["balance"] === "number" ? details["balance"] : null,
        };
      }
    }
  }
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const values = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") values.set(key, String(value));
  }
  const encoded = values.toString();
  return encoded ? "?" + encoded : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function dataOf<T>(body: unknown): T {
  const record = asRecord(body);
  return ("data" in record ? record["data"] : body) as T;
}

export interface SwarmhitClientOptions {
  apiKey: string;
  fetchImpl?: SwarmhitFetch;
  baseUrl?: string;
  /** Organization key acting on a workspace: X-Swarmhit-Workspace header. */
  workspaceId?: string | null;
}

export class SwarmhitClient {
  private readonly apiKey: string;
  private readonly fetchImpl: SwarmhitFetch;
  private readonly baseUrl: string;
  private readonly workspaceId?: string | null;

  constructor(options: SwarmhitClientOptions) {
    if (!options.apiKey) throw new Error("SwarmHit API key is required.");
    if (!options.apiKey.startsWith("swh_live_") && !options.apiKey.startsWith("swh_test_")) {
      // Keys are issued as swh_live_… (full value shown only once). Accept
      // other values in tests, but warn operators who paste the wrong thing.
      // eslint-disable-next-line no-console
      console.warn("SwarmHit API key does not start with swh_live_; check it is an API key, not a password.");
    }
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? (((url, init) =>
      (globalThis as never as { fetch: SwarmhitFetch }).fetch(url, init)) as SwarmhitFetch);
    this.baseUrl = (options.baseUrl ?? SWARMHIT_BASE_URL).replace(/\/+$/, "");
    this.workspaceId = options.workspaceId ?? null;
  }

  private async request<T>(
    path: string,
    init: Parameters<SwarmhitFetch>[1] = {},
    idempotencyKey?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: "Bearer " + this.apiKey,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...(this.workspaceId ? { "X-Swarmhit-Workspace": this.workspaceId } : {}),
      ...(init?.headers ?? {}),
    };
    const response = await this.fetchImpl(this.baseUrl + path, { ...init, headers });
    if (!response.ok) {
      const text = await response.text();
      let code: string | undefined;
      let details: Record<string, unknown> | undefined;
      let message = text || "SwarmHit request failed";
      try {
        const parsed = asRecord(JSON.parse(text));
        const error = asRecord(parsed["error"]);
        if (typeof error["message"] === "string") message = error["message"];
        if (typeof error["code"] === "string") code = error["code"];
        if (error["details"] !== undefined) details = asRecord(error["details"]);
      } catch {
        // Non-JSON error body (e.g. 400/413 before the API): keep raw text.
      }
      throw new SwarmhitApiError(
        `SwarmHit HTTP ${response.status}: ${message}`,
        response.status,
        code,
        details,
      );
    }
    return response.json() as Promise<T>;
  }

  private async list<T>(path: string): Promise<SwarmhitPagedResult<T>> {
    const body = await this.request<unknown>(path);
    const record = asRecord(body);
    const items = Array.isArray(record["data"]) ? (record["data"] as T[]) : [];
    return { items, paging: asRecord(record["paging"]) };
  }

  // -- General ----------------------------------------------------------

  /** GET / — API info + the workspace the key acts on. Harmless key check. */
  async getApiInfo(): Promise<SwarmhitApiInfo> {
    return dataOf<SwarmhitApiInfo>(await this.request<unknown>("/"));
  }

  /** GET /health — public health check (no workspace data). */
  async getHealth(): Promise<{ ok: boolean; service?: string; checks?: Record<string, unknown> }> {
    return this.request<{ ok: boolean; service?: string; checks?: Record<string, unknown> }>("/health");
  }

  /** GET /stats — workspace campaign / lead / sender counts. */
  async getStats(): Promise<Record<string, unknown>> {
    return dataOf<Record<string, unknown>>(await this.request<unknown>("/stats"));
  }

  // -- Accounts ---------------------------------------------------------

  /** GET /accounts — connected LinkedIn accounts (credentials never returned). */
  async listAccounts(input?: { limit?: number; offset?: number; archived?: boolean }): Promise<SwarmhitPagedResult<SwarmhitAccount>> {
    return this.list<SwarmhitAccount>("/accounts" + query({
      limit: input?.limit,
      offset: input?.offset,
      archived: input?.archived,
    }));
  }

  /** GET /accounts/{id} */
  async getAccount(accountId: string): Promise<SwarmhitAccount> {
    return dataOf<SwarmhitAccount>(await this.request<unknown>(`/accounts/${encodeURIComponent(accountId)}`));
  }

  /** GET /accounts/{id}/stats — sender performance. */
  async getAccountStats(accountId: string, input?: { days?: number }): Promise<Record<string, unknown>> {
    return dataOf<Record<string, unknown>>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/stats` + query({ days: input?.days }),
    ));
  }

  /** GET /accounts/{id}/limits — the caps in force for this sender. */
  async getAccountLimits(accountId: string): Promise<Record<string, unknown>> {
    return dataOf<Record<string, unknown>>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/limits`,
    ));
  }

  /**
   * POST /accounts/hosted-link — mint a one-time URL where the person
   * connects their own LinkedIn account. This is the supported connect
   * path: linkedin-os never handles a LinkedIn password, so there is
   * deliberately no POST /accounts (username/password) method here.
   */
  async createHostedConnectLink(input: {
    redirectUrl?: string;
    accountId?: string;
  }): Promise<Record<string, unknown>> {
    return dataOf<Record<string, unknown>>(await this.request<unknown>("/accounts/hosted-link", {
      method: "POST",
      body: JSON.stringify(input),
    }));
  }

  /** GET /accounts/hosted-link/{id} — state of a hosted connect link. */
  async getHostedConnectLink(id: string): Promise<Record<string, unknown>> {
    return dataOf<Record<string, unknown>>(await this.request<unknown>(
      `/accounts/hosted-link/${encodeURIComponent(id)}`,
    ));
  }

  // -- Direct actions ---------------------------------------------------

  /** POST /accounts/{id}/connections — invite. Note: premium senders only, ≤300 chars. */
  async sendConnection(
    accountId: string,
    input: { profileUrl: string; note?: string },
    idempotencyKey?: string,
  ): Promise<SwarmhitOutreachAction> {
    if (!input.profileUrl) throw new Error("profileUrl is required to send a connection request.");
    if (input.note !== undefined && input.note.length > 300) {
      throw new Error("Connection note must be at most 300 characters.");
    }
    return dataOf<SwarmhitOutreachAction>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/connections`,
      { method: "POST", body: JSON.stringify(input) },
      idempotencyKey,
    ));
  }

  /** GET /accounts/{id}/connections/{identifier} — status, no profile view used. */
  async checkConnection(accountId: string, identifier: string): Promise<SwarmhitConnection> {
    return dataOf<SwarmhitConnection>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/connections/${encodeURIComponent(identifier.toLowerCase())}`,
    ));
  }

  /** DELETE /accounts/{id}/connections/{identifier} — withdraw a pending invite. */
  async withdrawConnection(
    accountId: string,
    identifier: string,
  ): Promise<{ withdrawn: boolean; alreadyGone: boolean }> {
    return dataOf<{ withdrawn: boolean; alreadyGone: boolean }>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/connections/${encodeURIComponent(identifier.toLowerCase())}`,
      { method: "DELETE" },
    ));
  }

  /** POST /accounts/{id}/messages — DM a 1st-degree connection. */
  async sendDirectMessage(
    accountId: string,
    input: { profileUrl: string; text: string; providerId?: string },
    idempotencyKey?: string,
  ): Promise<SwarmhitOutreachAction> {
    if (!input.text?.trim()) throw new Error("Message text is required.");
    return dataOf<SwarmhitOutreachAction>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/messages`,
      { method: "POST", body: JSON.stringify(input) },
      idempotencyKey,
    ));
  }

  /** POST /accounts/{id}/inmails — InMail a non-connection (premium sender only). */
  async sendInmail(
    accountId: string,
    input: { profileUrl: string; text: string; subject?: string; providerId?: string },
    idempotencyKey?: string,
  ): Promise<SwarmhitOutreachAction> {
    if (!input.text?.trim()) throw new Error("InMail text is required.");
    return dataOf<SwarmhitOutreachAction>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/inmails`,
      { method: "POST", body: JSON.stringify(input) },
      idempotencyKey,
    ));
  }

  /** POST /accounts/{id}/profile-views */
  async visitProfile(
    accountId: string,
    input: { profileUrl: string },
    idempotencyKey?: string,
  ): Promise<SwarmhitOutreachAction> {
    return dataOf<SwarmhitOutreachAction>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/profile-views`,
      { method: "POST", body: JSON.stringify(input) },
      idempotencyKey,
    ));
  }

  /** POST /accounts/{id}/follows */
  async followProfile(
    accountId: string,
    input: { profileUrl: string },
    idempotencyKey?: string,
  ): Promise<SwarmhitOutreachAction> {
    return dataOf<SwarmhitOutreachAction>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/follows`,
      { method: "POST", body: JSON.stringify(input) },
      idempotencyKey,
    ));
  }

  /**
   * POST /accounts/{id}/post-likes — exactly one of postUrl / profileUrl.
   * 422 when the lead has no recent post.
   */
  async likePost(
    accountId: string,
    input: { postUrl?: string; profileUrl?: string; reactionType?: SwarmhitReactionType },
    idempotencyKey?: string,
  ): Promise<SwarmhitOutreachAction> {
    if (!input.postUrl && !input.profileUrl) throw new Error("postUrl or profileUrl is required to like a post.");
    if (input.postUrl && input.profileUrl) throw new Error("Pass exactly one of postUrl / profileUrl.");
    return dataOf<SwarmhitOutreachAction>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/post-likes`,
      { method: "POST", body: JSON.stringify(input) },
      idempotencyKey,
    ));
  }

  /**
   * POST /accounts/{id}/post-comments — exactly one of postUrl / profileUrl,
   * plus the exact text. commentId replies to a comment on that post.
   */
  async commentPost(
    accountId: string,
    input: { postUrl?: string; profileUrl?: string; text: string; commentId?: string },
    idempotencyKey?: string,
  ): Promise<SwarmhitOutreachAction> {
    if (!input.text?.trim()) throw new Error("Comment text is required.");
    if (!input.postUrl && !input.profileUrl) throw new Error("postUrl or profileUrl is required to comment.");
    if (input.postUrl && input.profileUrl) throw new Error("Pass exactly one of postUrl / profileUrl.");
    return dataOf<SwarmhitOutreachAction>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/post-comments`,
      { method: "POST", body: JSON.stringify(input) },
      idempotencyKey,
    ));
  }

  /** GET /accounts/{id}/post-comments?postUrl=… — comments on a post, to reply to. */
  async listPostComments(
    accountId: string,
    input: { postUrl: string; limit?: number; cursor?: string },
  ): Promise<SwarmhitPagedResult<Record<string, unknown>>> {
    const body = await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/post-comments` + query({
        postUrl: input.postUrl,
        limit: input.limit,
        cursor: input.cursor,
      }),
    );
    const record = asRecord(body);
    return {
      items: Array.isArray(record["data"]) ? (record["data"] as Record<string, unknown>[]) : [],
      paging: asRecord(record["paging"]),
    };
  }

  /** GET /accounts/{id}/profiles/{identifier} — silent profile lookup. */
  async lookupProfile(accountId: string, identifier: string): Promise<Record<string, unknown>> {
    return dataOf<Record<string, unknown>>(await this.request<unknown>(
      `/accounts/${encodeURIComponent(accountId)}/profiles/${encodeURIComponent(identifier.toLowerCase())}`,
    ));
  }

  /** GET /accounts/{id}/actions — direct actions taken from this sender. */
  async listOutreachActions(
    accountId: string,
    input?: { type?: string; status?: string; limit?: number; offset?: number },
  ): Promise<SwarmhitPagedResult<SwarmhitOutreachAction>> {
    return this.list<SwarmhitOutreachAction>(`/accounts/${encodeURIComponent(accountId)}/actions` + query({
      type: input?.type,
      status: input?.status,
      limit: input?.limit,
      offset: input?.offset,
    }));
  }

  // -- Campaigns --------------------------------------------------------

  /** POST /campaigns — creates a campaign, paused by default. */
  async createCampaign(input: SwarmhitCampaignInput): Promise<SwarmhitCampaign> {
    if (!input.name?.trim()) throw new Error("Campaign name is required.");
    if (!input.linkedinAccountIds?.length) throw new Error("At least one LinkedIn sender account is required.");
    return dataOf<SwarmhitCampaign>(await this.request<unknown>("/campaigns", {
      method: "POST",
      body: JSON.stringify(input),
    }));
  }

  /** GET /campaigns */
  async listCampaigns(input?: { limit?: number; offset?: number }): Promise<SwarmhitPagedResult<SwarmhitCampaign>> {
    return this.list<SwarmhitCampaign>("/campaigns" + query({ limit: input?.limit, offset: input?.offset }));
  }

  /** GET /campaigns/{id} — includes the outreach sequence tree. */
  async getCampaign(campaignId: string): Promise<SwarmhitCampaign> {
    return dataOf<SwarmhitCampaign>(await this.request<unknown>(`/campaigns/${encodeURIComponent(campaignId)}`));
  }

  /** PATCH /campaigns/{id} — e.g. { status: "active" } to start sending. */
  async updateCampaign(campaignId: string, input: Record<string, unknown>): Promise<SwarmhitCampaign> {
    return dataOf<SwarmhitCampaign>(await this.request<unknown>(`/campaigns/${encodeURIComponent(campaignId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }));
  }

  // -- Leads & imports --------------------------------------------------

  /** GET /leads — the workspace address book. */
  async listLeads(input?: { limit?: number; offset?: number }): Promise<SwarmhitPagedResult<SwarmhitLead>> {
    return this.list<SwarmhitLead>("/leads" + query({ limit: input?.limit, offset: input?.offset }));
  }

  /**
   * POST /lead-imports — start a LinkedIn / Sales Navigator search import.
   * maxLeads is clamped to 1–2500 (missing / non-positive means 100 server-side).
   */
  async createLeadImport(input: SwarmhitLeadImportInput): Promise<SwarmhitLeadImport> {
    const maxLeads = input.maxLeads === undefined
      ? undefined
      : Math.max(1, Math.min(2500, Math.floor(input.maxLeads)));
    return dataOf<SwarmhitLeadImport>(await this.request<unknown>("/lead-imports", {
      method: "POST",
      body: JSON.stringify({ ...input, ...(maxLeads === undefined ? {} : { maxLeads }) }),
    }));
  }

  async listLeadImports(input?: { status?: string; limit?: number; offset?: number }): Promise<SwarmhitPagedResult<SwarmhitLeadImport>> {
    return this.list<SwarmhitLeadImport>("/lead-imports" + query({
      status: input?.status,
      limit: input?.limit,
      offset: input?.offset,
    }));
  }

  async getLeadImport(id: string): Promise<SwarmhitLeadImport> {
    return dataOf<SwarmhitLeadImport>(await this.request<unknown>(`/lead-imports/${encodeURIComponent(id)}`));
  }

  async cancelLeadImport(id: string): Promise<SwarmhitLeadImport> {
    return dataOf<SwarmhitLeadImport>(await this.request<unknown>(`/lead-imports/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
    }));
  }

  async resumeLeadImport(id: string): Promise<SwarmhitLeadImport> {
    return dataOf<SwarmhitLeadImport>(await this.request<unknown>(`/lead-imports/${encodeURIComponent(id)}/resume`, {
      method: "POST",
    }));
  }

  // -- Database ---------------------------------------------------------

  /**
   * POST /database/people/search — at least one filter required.
   * limit 1–100, default 25. Every result consumes workspace credits.
   */
  async searchPeopleDatabase(input: {
    filters: Record<string, unknown>;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: SwarmhitDbPerson[]; paging?: Record<string, unknown> }> {
    if (!input.filters || Object.keys(input.filters).length === 0) {
      throw new Error("At least one database filter is required.");
    }
    const body = await this.request<unknown>("/database/people/search", {
      method: "POST",
      body: JSON.stringify({
        filters: input.filters,
        limit: Math.max(1, Math.min(100, input.limit ?? 25)),
        ...(input.cursor ? { cursor: input.cursor } : {}),
      }),
    });
    const record = asRecord(body);
    return {
      items: Array.isArray(record["data"]) ? (record["data"] as SwarmhitDbPerson[]) : [],
      paging: asRecord(record["paging"]),
    };
  }

  /** POST /database/companies/search */
  async searchCompaniesDatabase(input: {
    filters: Record<string, unknown>;
    limit?: number;
    cursor?: string;
    sort?: { key?: string; dir?: "asc" | "desc" };
  }): Promise<{ items: Record<string, unknown>[]; paging?: Record<string, unknown> }> {
    if (!input.filters || Object.keys(input.filters).length === 0) {
      throw new Error("At least one database filter is required.");
    }
    const body = await this.request<unknown>("/database/companies/search", {
      method: "POST",
      body: JSON.stringify({
        filters: input.filters,
        limit: Math.max(1, Math.min(100, input.limit ?? 25)),
        ...(input.cursor ? { cursor: input.cursor } : {}),
        ...(input.sort ? { sort: input.sort } : {}),
      }),
    });
    const record = asRecord(body);
    return {
      items: Array.isArray(record["data"]) ? (record["data"] as Record<string, unknown>[]) : [],
      paging: asRecord(record["paging"]),
    };
  }

  /** POST /database/people/enrich — full profile from a LinkedIn URL. */
  async enrichPerson(input: { linkedinUrl: string; includeEmail?: boolean }): Promise<SwarmhitDbPersonDetail> {
    return dataOf<SwarmhitDbPersonDetail>(await this.request<unknown>("/database/people/enrich", {
      method: "POST",
      body: JSON.stringify(input),
    }));
  }

  /** POST /database/people/find-email — verified work email only. */
  async findPersonEmail(input: {
    linkedinUrl?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    domain?: string;
  }): Promise<Record<string, unknown>> {
    return dataOf<Record<string, unknown>>(await this.request<unknown>("/database/people/find-email", {
      method: "POST",
      body: JSON.stringify(input),
    }));
  }

  // -- Inbox ------------------------------------------------------------

  /** GET /inbox/chats */
  async listInboxChats(input?: {
    limit?: number;
    offset?: number;
    replied?: boolean;
    channel?: string;
    senderId?: string;
  }): Promise<SwarmhitPagedResult<SwarmhitChat>> {
    return this.list<SwarmhitChat>("/inbox/chats" + query({
      limit: input?.limit,
      offset: input?.offset,
      replied: input?.replied === undefined ? undefined : String(input.replied),
      channel: input?.channel,
      senderId: input?.senderId,
    }));
  }

  /** GET /inbox/chats/{id} */
  async getInboxChat(chatId: string): Promise<SwarmhitChat> {
    return dataOf<SwarmhitChat>(await this.request<unknown>(`/inbox/chats/${encodeURIComponent(chatId)}`));
  }

  /** GET /inbox/chats/{id}/messages */
  async listChatMessages(chatId: string, input?: { limit?: number; offset?: number }): Promise<SwarmhitPagedResult<SwarmhitChatMessage>> {
    return this.list<SwarmhitChatMessage>(`/inbox/chats/${encodeURIComponent(chatId)}/messages` + query({
      limit: input?.limit,
      offset: input?.offset,
    }));
  }

  /**
   * POST /inbox/chats/{id}/messages — reply in a thread.
   * Text is optional when an attachment or voice message is provided.
   * Attachments are fetched from a public URL (max 15 MB each);
   * a voice note is fetched + transcoded server-side (max ~1 minute).
   */
  async sendChatMessage(
    chatId: string,
    input: {
      text?: string;
      attachments?: Array<{ url: string; name?: string }>;
      voiceMessage?: { url: string; durationMs?: number };
      sequenceAction?: "pause" | "stop" | null;
    },
    idempotencyKey?: string,
  ): Promise<{ ok: boolean; messageId?: string | null; campaignLead?: Record<string, unknown> | null }> {
    if (!input.text?.trim() && !input.attachments?.length && !input.voiceMessage) {
      throw new Error("Text, an attachment or a voice message is required to reply.");
    }
    return dataOf<{ ok: boolean; messageId?: string | null }>(await this.request<unknown>(
      `/inbox/chats/${encodeURIComponent(chatId)}/messages`,
      { method: "POST", body: JSON.stringify(input) },
      idempotencyKey,
    ));
  }

  /** POST /inbox/chats/{id}/read */
  async markChatRead(chatId: string): Promise<{ ok: boolean }> {
    return dataOf<{ ok: boolean }>(await this.request<unknown>(
      `/inbox/chats/${encodeURIComponent(chatId)}/read`,
      { method: "POST" },
    ));
  }

  /** POST /inbox/sync — pull a sender's recent chats from LinkedIn. */
  async syncInbox(input: { accountId: string; limit?: number }): Promise<{ fetched: number; imported: number }> {
    return dataOf<{ fetched: number; imported: number }>(await this.request<unknown>("/inbox/sync", {
      method: "POST",
      body: JSON.stringify({ accountId: input.accountId, limit: Math.max(1, Math.min(100, input.limit ?? 50)) }),
    }));
  }

  // -- Approvals (AI comments / voice notes) ----------------------------

  /** GET /pending-comments */
  async listPendingComments(input?: { status?: string; campaignId?: string; limit?: number; offset?: number }): Promise<SwarmhitPagedResult<SwarmhitPendingComment>> {
    return this.list<SwarmhitPendingComment>("/pending-comments" + query({
      status: input?.status,
      campaignId: input?.campaignId,
      limit: input?.limit,
      offset: input?.offset,
    }));
  }

  /** GET /pending-comments/{id} */
  async getPendingComment(id: string): Promise<SwarmhitPendingComment> {
    return dataOf<SwarmhitPendingComment>(await this.request<unknown>(`/pending-comments/${encodeURIComponent(id)}`));
  }

  /** PATCH /pending-comments/{id} — replace the draft text, without approving. */
  async editPendingComment(id: string, text: string): Promise<SwarmhitPendingComment> {
    return dataOf<SwarmhitPendingComment>(await this.request<unknown>(`/pending-comments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ text }),
    }));
  }

  /** POST /pending-comments/{id}/approve — optionally replacing the text. */
  async approvePendingComment(id: string, text?: string): Promise<SwarmhitPendingComment> {
    return dataOf<SwarmhitPendingComment>(await this.request<unknown>(
      `/pending-comments/${encodeURIComponent(id)}/approve`,
      { method: "POST", body: JSON.stringify(text === undefined ? {} : { text }) },
    ));
  }

  /** POST /pending-comments/{id}/reject */
  async rejectPendingComment(id: string): Promise<SwarmhitPendingComment> {
    return dataOf<SwarmhitPendingComment>(await this.request<unknown>(
      `/pending-comments/${encodeURIComponent(id)}/reject`,
      { method: "POST" },
    ));
  }

  /** POST /pending-comments/{id}/regenerate — AI re-drafts, optionally with a new prompt. */
  async regeneratePendingComment(id: string, prompt?: string): Promise<SwarmhitPendingComment> {
    return dataOf<SwarmhitPendingComment>(await this.request<unknown>(
      `/pending-comments/${encodeURIComponent(id)}/regenerate`,
      { method: "POST", body: JSON.stringify(prompt === undefined ? {} : { prompt }) },
    ));
  }

  // -- Webhooks (registration) ------------------------------------------

  /** GET /webhooks */
  async listWebhooks(input?: { limit?: number; offset?: number }): Promise<SwarmhitPagedResult<Record<string, unknown>>> {
    return this.list<Record<string, unknown>>("/webhooks" + query({ limit: input?.limit, offset: input?.offset }));
  }

  /**
   * POST /webhooks — register an endpoint. The response includes a
   * `secret` (whsec_…) — store it in Vault; it verifies deliveries.
   */
  async createWebhook(input: { url: string; events: string[] }): Promise<Record<string, unknown>> {
    return dataOf<Record<string, unknown>>(await this.request<unknown>("/webhooks", {
      method: "POST",
      body: JSON.stringify(input),
    }));
  }
}
