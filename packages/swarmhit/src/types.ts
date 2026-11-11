/**
 * SwarmHit types.
 *
 * Shapes are taken from SwarmHit's public OpenAPI 3.1 file
 * (https://app.swarmhit.com/openapi.yaml, version 1.25.0, read 2026-11-10).
 * Where the OpenAPI leaves a field open-ended, the type is
 * `Record<string, unknown>` and the field is documented as such — do not
 * treat a loose field as a verified contract.
 */

export interface SwarmhitApiInfo {
  name?: string;
  version?: string;
  workspace?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SwarmhitAccount {
  id: string;
  label?: string | null;
  username?: string | null;
  displayName?: string | null;
  profileUrl?: string | null;
  platform?: string | null;
  status?: string | null;
  paused?: boolean;
  pausedReason?: string | null;
  /** Whether the LinkedIn account has a premium plan (drives note/InMail). */
  isPremium?: boolean;
  inmailCredits?: number | null;
  ssi?: number | null;
  health?: string | null;
  cooldownUntil?: string | null;
  [key: string]: unknown;
}

export interface SwarmhitConnection {
  status: "not_connected" | "pending" | "connected" | string;
  degree?: number | null;
  canMessage?: boolean;
  canInvite?: boolean;
  isOpenProfile?: boolean;
  providerId?: string | null;
  profileUrl?: string | null;
  [key: string]: unknown;
}

export interface SwarmhitOutreachAction {
  id?: string;
  type?: string;
  status?: string;
  profileUrl?: string | null;
  note?: string | null;
  providerId?: string | null;
  accountId?: string | null;
  [key: string]: unknown;
}

export interface SwarmhitRateLimit {
  limit: number;
  used: number;
  scope: "day" | "week" | "pending" | "inmail_credits" | string;
  resetAt?: string | null;
  balance?: number | null;
}

export interface SwarmhitPagedResult<T> {
  items: T[];
  paging?: Record<string, unknown>;
}

export interface SwarmhitCampaignStep {
  id?: string;
  type: string;
  parent?: string | null;
  branch?: string | null;
  nextDelayHours?: number;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SwarmhitCampaignInput {
  name: string;
  linkedinAccountIds: string[];
  /** "draft" | "active" | "paused" | "finished". Created paused by default. */
  status?: string;
  sequence?: { steps: SwarmhitCampaignStep[] };
  schedule?: Record<string, unknown>;
  aiInterestEnabled?: boolean;
  emailAccountIds?: string[];
  senderIds?: string[];
  excludeListIds?: string[];
  [key: string]: unknown;
}

export interface SwarmhitCampaign {
  id: string;
  name?: string;
  status?: string;
  stats?: Record<string, unknown>;
  linkedinAccountIds?: string[];
  sequence?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SwarmhitLead {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  title?: string | null;
  company?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

export interface SwarmhitLeadImportInput {
  accountId: string;
  /** Raw LinkedIn / Sales Navigator search URL. Either url or params. */
  url?: string;
  /** Structured search filter: { api: "classic" | "sales_navigator", category, ... } */
  params?: Record<string, unknown>;
  listId?: string;
  listName?: string;
  campaignId?: string;
  name?: string;
  /** Cap on leads stored. At most 2500; missing / non-positive means 100. */
  maxLeads?: number;
  tags?: string[];
}

export interface SwarmhitLeadImport {
  id?: string;
  status?: string;
  accountId?: string | null;
  listId?: string | null;
  campaignId?: string | null;
  [key: string]: unknown;
}

/**
 * Database people-search filters. Named keys are the verified ones from
 * DbPeopleFilters in the OpenAPI; any other key is passed through as-is
 * and will be rejected by SwarmHit if unknown.
 */
export type SwarmhitDbPeopleFilters = Record<string, unknown>;

export interface SwarmhitDbPerson {
  id?: number | string | null;
  name?: string | null;
  firstName?: string;
  lastName?: string;
  headline?: string | null;
  title?: string | null;
  location?: string | null;
  country?: string | null;
  linkedinUrl?: string | null;
  company?: {
    name?: string | null;
    title?: string | null;
    domain?: string | null;
    linkedinUrl?: string | null;
    headcount?: number | null;
    headcountRange?: string | null;
    industries?: string[];
    [key: string]: unknown;
  } | null;
  contact?: {
    hasBusinessEmail?: boolean;
    hasPersonalEmail?: boolean;
    hasPhone?: boolean;
    [key: string]: unknown;
  };
  businessEmails?: string[];
  saved?: boolean;
  [key: string]: unknown;
}

export interface SwarmhitDbPersonDetail extends SwarmhitDbPerson {
  summary?: string | null;
  skills?: string[];
  websites?: string[];
  connections?: number | null;
  followers?: number | null;
  emailLookupPending?: boolean;
}

export interface SwarmhitChat {
  id: string;
  channel?: string | null;
  leadId?: string | null;
  label?: string | null;
  unread?: number | null;
  [key: string]: unknown;
}

export interface SwarmhitChatMessage {
  id?: string;
  text?: string | null;
  at?: string | null;
  from?: string | null;
  [key: string]: unknown;
}

export interface SwarmhitAttachment {
  url: string;
  name?: string;
}

export interface SwarmhitVoiceMessage {
  url: string;
  durationMs?: number;
}

export interface SwarmhitPendingComment {
  id: string;
  text?: string | null;
  status?: string | null;
  campaignId?: string | null;
  leadId?: string | null;
  postUrl?: string | null;
  [key: string]: unknown;
}

export type SwarmhitReactionType =
  | "like"
  | "celebrate"
  | "support"
  | "love"
  | "insightful"
  | "funny";
