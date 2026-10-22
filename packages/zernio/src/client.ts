export interface ZernioAccount {
  id: string;
  platform: string;
  username?: string | null;
  displayName?: string | null;
  profileUrl?: string | null;
  isActive?: boolean;
  hasAnalyticsAccess?: boolean;
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
