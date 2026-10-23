export interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  email?: string;
  email_verified?: boolean;
}

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
}

export type LinkedInPublishTransport = "ugcPosts" | "posts";

export interface LinkedInHttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
  headers?: { get(name: string): string | null };
}

export type LinkedInFetch = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<LinkedInHttpResponse>;

export interface PublishResult {
  id?: string;
  transport: LinkedInPublishTransport;
}

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

async function parseError(response: LinkedInHttpResponse): Promise<never> {
  const body = await response.text();
  throw new Error(`LinkedIn HTTP ${response.status}: ${body || "request failed"}`);
}

export class LinkedInOfficialClient {
  constructor(
    private readonly fetchImpl: LinkedInFetch = ((url, init) =>
      (globalThis as any).fetch(url, init)) as LinkedInFetch,
  ) {}

  buildAuthorizationUrl(input: {
    clientId: string;
    redirectUri: string;
    state: string;
    scopes?: string[];
  }): string {
    const scopes = input.scopes ?? ["openid", "profile", "email", "w_member_social"];
    const q = new URLSearchParams({
      response_type: "code",
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      state: input.state,
      scope: scopes.join(" "),
    });
    return AUTH_URL + "?" + q.toString();
  }

  async exchangeCode(input: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
  }): Promise<LinkedInTokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
    }).toString();

    const response = await this.fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!response.ok) return parseError(response);
    return response.json() as Promise<LinkedInTokenResponse>;
  }

  async getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
    const response = await this.fetchImpl(USERINFO_URL, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/json",
      },
    });
    if (!response.ok) return parseError(response);
    return response.json() as Promise<LinkedInUserInfo>;
  }

  async publishTextPost(input: {
    accessToken: string;
    authorUrn: string;
    text: string;
    transport: LinkedInPublishTransport;
    linkedInVersion?: string;
  }): Promise<PublishResult> {
    const text = input.text.trim();
    if (!text) throw new Error("LinkedIn post content is empty.");
    if (!/^urn:li:person:[^\s]+$/.test(input.authorUrn)) {
      throw new Error("A LinkedIn member Person URN is required for personal publishing.");
    }

    if (input.transport === "posts") {
      if (!input.linkedInVersion || !/^\d{6}$/.test(input.linkedInVersion)) {
        throw new Error("Linkedin-Version in YYYYMM format is required for the Posts API.");
      }
      const response = await this.fetchImpl("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + input.accessToken,
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
          "Linkedin-Version": input.linkedInVersion,
        },
        body: JSON.stringify({
          author: input.authorUrn,
          commentary: text,
          visibility: "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: "PUBLISHED",
          isReshareDisabledByAuthor: false,
        }),
      });
      if (!response.ok) return parseError(response);
      return { id: response.headers?.get("x-restli-id") ?? undefined, transport: "posts" };
    }

    const response = await this.fetchImpl("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + input.accessToken,
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: input.authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });
    if (!response.ok) return parseError(response);
    return { id: response.headers?.get("x-restli-id") ?? undefined, transport: "ugcPosts" };
  }
}
