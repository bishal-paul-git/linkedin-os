export interface ZernioAccount {
  id: string;
  platform: string;
  username?: string | null;
  displayName?: string | null;
  profileUrl?: string | null;
  isActive?: boolean;
  hasAnalyticsAccess?: boolean;
}

export interface ZernioExternalPost {
  platform?: string;
  platformPostId?: string;
  platformPostUrl?: string;
  content?: string | null;
  publishedAt?: string | null;
  mediaType?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  analytics?: Record<string, unknown>;
}

export interface ZernioExternalSyncResult {
  synced?: { postsFound?: number; postsSynced?: number; skipped?: boolean };
  found?: boolean;
  post?: ZernioExternalPost;
  posts?: ZernioExternalPost[];
}

export interface ZernioPostResult {
  id?: string;
  status?: string;
  platforms?: Array<{
    platform?: string;
    accountId?: unknown;
    status?: string;
    platformPostId?: string;
    platformPostUrl?: string;
  }>;
}

export interface ZernioHttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type ZernioFetch = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<ZernioHttpResponse>;

function query(params: Record<string, string | undefined>): string {
  const values = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") values.set(key, value);
  }
  const encoded = values.toString();
  return encoded ? "?" + encoded : "";
}

export class ZernioClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: ZernioFetch = ((url, init) =>
      (globalThis as any).fetch(url, init)) as ZernioFetch,
    private readonly baseUrl = "https://zernio.com/api/v1",
  ) {
    if (!apiKey) throw new Error("Zernio API key is required.");
  }

  private async request(path: string, init: Parameters<ZernioFetch>[1] = {}) {
    const response = await this.fetchImpl(this.baseUrl + path, {
      ...init,
      headers: {
        Authorization: "Bearer " + this.apiKey,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Zernio HTTP ${response.status}: ${body || "request failed"}`);
    }

    return response.json();
  }

  async listAccounts(): Promise<ZernioAccount[]> {
    const body = await this.request("/accounts") as { accounts?: Array<Record<string, unknown>> };
    return (body.accounts ?? []).map((a) => ({
      id: String(a.id ?? a._id ?? ""),
      platform: String(a.platform ?? ""),
      username: typeof a.username === "string" ? a.username : null,
      displayName: typeof a.displayName === "string" ? a.displayName : null,
      profileUrl: typeof a.profileUrl === "string" ? a.profileUrl : null,
      isActive: typeof a.isActive === "boolean" ? a.isActive : undefined,
      hasAnalyticsAccess:
        typeof a.hasAnalyticsAccess === "boolean" ? a.hasAnalyticsAccess : undefined,
    })).filter((a) => Boolean(a.id));
  }

  async syncExternalPosts(input: {
    accountId: string;
    url?: string;
    postId?: string;
  }): Promise<ZernioExternalSyncResult> {
    return this.request("/posts/sync-external", {
      method: "POST",
      body: JSON.stringify({
        accountId: input.accountId,
        ...(input.url ? { url: input.url } : {}),
        ...(input.postId ? { postId: input.postId } : {}),
      }),
    }) as Promise<ZernioExternalSyncResult>;
  }

  async getLinkedInAnalytics(input: {
    accountId: string;
    fromDate: string;
    toDate: string;
  }): Promise<Record<string, unknown>> {
    return this.request("/analytics" + query({
      platform: "linkedin",
      accountId: input.accountId,
      fromDate: input.fromDate,
      toDate: input.toDate,
    })) as Promise<Record<string, unknown>>;
  }

  async getBestTime(input: {
    accountId: string;
  }): Promise<Record<string, unknown>> {
    return this.request("/analytics/best-time" + query({
      platform: "linkedin",
      accountId: input.accountId,
    })) as Promise<Record<string, unknown>>;
  }

  async getPostingFrequency(input: {
    accountId: string;
  }): Promise<Record<string, unknown>> {
    return this.request("/analytics/posting-frequency" + query({
      platform: "linkedin",
      accountId: input.accountId,
    })) as Promise<Record<string, unknown>>;
  }

  async listLinkedInPageComments(input: {
    accountId: string;
    limit?: number;
  }): Promise<Record<string, unknown>> {
    return this.request("/inbox/comments" + query({
      platform: "linkedin",
      accountId: input.accountId,
      limit: String(input.limit ?? 50),
      sortBy: "date",
      sortOrder: "desc",
    })) as Promise<Record<string, unknown>>;
  }

  async createLinkedInPost(input: {
    accountId: string;
    content: string;
    scheduledFor?: string;
    timezone?: string;
  }): Promise<ZernioPostResult> {
    const body = await this.request("/posts", {
      method: "POST",
      body: JSON.stringify({
        content: input.content,
        ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
        platforms: [{ platform: "linkedin", accountId: input.accountId }],
      }),
    }) as { post?: ZernioPostResult };

    return body.post ?? {};
  }
}
