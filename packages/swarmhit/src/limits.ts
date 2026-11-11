import type { SwarmhitRateLimit } from "./types.ts";

/**
 * Hard-coded SwarmHit / LinkedIn limits, from SwarmHit's own OpenAPI
 * (version 1.25.0, read 2026-11-10) and the limits the parent chat
 * verified on SwarmHit's endpoint pages on 2026-11-09.
 *
 * - Weekly invites are a rolling 7 days, tier-based: 130 for free
 *   LinkedIn accounts, 150 for paid; pending-invitation backlog 500.
 * - Daily caps exist per action, enforced server-side (429 with
 *   { limit, used, scope, resetAt }). SwarmHit does NOT publish an
 *   exact daily DM number, so the DM ceiling here is the safe
 *   operator zone (30–40/day), not a SwarmHit-published cap.
 * - Import caps: 2,500 profiles/day from Sales Navigator search,
 *   1,000/day from standard LinkedIn search.
 */

export const INVITE_WEEKLY_LIMIT_FREE = 130;
export const INVITE_WEEKLY_LIMIT_PAID = 150;
export const INVITE_DAILY_SAFE_LIMIT = 20;
export const INVITE_PENDING_BACKLOG_LIMIT = 500;
export const DM_DAILY_SAFE_LIMIT = 40;
export const DM_DAILY_SAFE_FLOOR = 30;
export const IMPORT_DAILY_LIMIT_SALES_NAVIGATOR = 2500;
export const IMPORT_DAILY_LIMIT_STANDARD = 1000;

export type RateBudgetKind =
  | "invite"
  | "message"
  | "inmail"
  | "profile_view"
  | "follow"
  | "post_like"
  | "post_comment"
  | "import";

export interface RateBudgetCheck {
  allowed: boolean;
  kind: RateBudgetKind;
  limit: number | null;
  used: number;
  resetAt: string | null;
  reason?: string;
}

/** A local (in-memory only) budget. Persist it in Supabase later. */
export interface RateBudgetState {
  daily: Record<string, { date: string; count: number }>;
  weeklyInvites: Record<string, string[]>;
  serverBlockedUntil: Record<string, string>;
}

function utcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nextUtcMidnight(date: Date): string {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  return next.toISOString();
}

export class RateBudget {
  private daily = new Map<string, { date: string; count: number }>();
  private weeklyInvites = new Map<string, string[]>();
  private serverBlockedUntil = new Map<string, string>();

  /** Local safe ceiling for a kind, or null when no local ceiling is known. */
  static localLimit(kind: RateBudgetKind, isPremium: boolean): number | null {
    switch (kind) {
      case "invite":
        return INVITE_DAILY_SAFE_LIMIT;
      case "message":
        return DM_DAILY_SAFE_LIMIT;
      case "import":
        return IMPORT_DAILY_LIMIT_STANDARD;
      default:
        return null;
    }
  }

  static weeklyInviteLimit(isPremium: boolean): number {
    return isPremium ? INVITE_WEEKLY_LIMIT_PAID : INVITE_WEEKLY_LIMIT_FREE;
  }

  check(
    accountId: string,
    kind: RateBudgetKind,
    input: { isPremium?: boolean; now?: Date } = {},
  ): RateBudgetCheck {
    const now = input.now ?? new Date();
    const isPremium = input.isPremium ?? false;
    const blockedUntil = this.serverBlockedUntil.get(`${accountId}:${kind}`);
    if (blockedUntil && new Date(blockedUntil) > now) {
      return {
        allowed: false,
        kind,
        limit: RateBudget.localLimit(kind, isPremium),
        used: this.dailyUsed(accountId, kind, now),
        resetAt: blockedUntil,
        reason: "SwarmHit returned 429 for this action; blocked until resetAt.",
      };
    }

    if (kind === "invite") {
      const weeklyLimit = RateBudget.weeklyInviteLimit(isPremium);
      const weeklyUsed = this.weeklyInviteCount(accountId, now);
      if (weeklyUsed >= weeklyLimit) {
        return {
          allowed: false,
          kind,
          limit: weeklyLimit,
          used: weeklyUsed,
          resetAt: this.weeklyResetAt(accountId, now),
          reason: `Weekly invite limit reached (${weeklyUsed}/${weeklyLimit}, rolling 7 days).`,
        };
      }
    }

    const limit = RateBudget.localLimit(kind, isPremium);
    const used = this.dailyUsed(accountId, kind, now);
    if (limit !== null && used >= limit) {
      return {
        allowed: false,
        kind,
        limit,
        used,
        resetAt: nextUtcMidnight(now),
        reason: `Daily safe limit reached (${used}/${limit}).`,
      };
    }

    return { allowed: true, kind, limit, used, resetAt: nextUtcMidnight(now) };
  }

  /** Record a successful send. Failures are not counted locally. */
  record(accountId: string, kind: RateBudgetKind, now: Date = new Date()): void {
    const key = `${accountId}:${kind}`;
    const today = utcDate(now);
    const entry = this.daily.get(key);
    this.daily.set(key, entry?.date === today ? { date: today, count: entry.count + 1 } : { date: today, count: 1 });
    if (kind === "invite") {
      const list = (this.weeklyInvites.get(accountId) ?? []).filter(
        (ts) => new Date(ts).getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000,
      );
      list.push(now.toISOString());
      this.weeklyInvites.set(accountId, list);
    }
  }

  /** Apply a server 429: block this kind until its resetAt (if given). */
  applyRateLimit(accountId: string, kind: RateBudgetKind, rateLimit: SwarmhitRateLimit): void {
    if (rateLimit.resetAt) {
      this.serverBlockedUntil.set(`${accountId}:${kind}`, rateLimit.resetAt);
    }
  }

  /** Build a blocked check result directly from a 429 payload. */
  static fromRateLimit(kind: RateBudgetKind, rateLimit: SwarmhitRateLimit): RateBudgetCheck {
    return {
      allowed: false,
      kind,
      limit: rateLimit.limit,
      used: rateLimit.used,
      resetAt: rateLimit.resetAt ?? null,
      reason: `SwarmHit rate limit (${rateLimit.scope}): ${rateLimit.used}/${rateLimit.limit}.`,
    };
  }

  dailyUsed(accountId: string, kind: RateBudgetKind, now: Date = new Date()): number {
    const entry = this.daily.get(`${accountId}:${kind}`);
    return entry?.date === utcDate(now) ? entry.count : 0;
  }

  weeklyInviteCount(accountId: string, now: Date = new Date()): number {
    return (this.weeklyInvites.get(accountId) ?? []).filter(
      (ts) => new Date(ts).getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).length;
  }

  private weeklyResetAt(accountId: string, now: Date): string | null {
    const list = (this.weeklyInvites.get(accountId) ?? [])
      .map((ts) => new Date(ts).getTime())
      .filter((t) => t > now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .sort((a, b) => a - b);
    if (!list.length) return null;
    return new Date((list[0] as number) + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}
