import test from "node:test";
import assert from "node:assert/strict";
import {
  DM_DAILY_SAFE_LIMIT,
  IMPORT_DAILY_LIMIT_SALES_NAVIGATOR,
  INVITE_DAILY_SAFE_LIMIT,
  INVITE_WEEKLY_LIMIT_FREE,
  INVITE_WEEKLY_LIMIT_PAID,
  RateBudget,
} from "./limits.ts";

const now = new Date("2026-11-10T10:00:00.000Z");

test("weekly invite limits differ by LinkedIn plan: 130 free, 150 paid", () => {
  assert.equal(RateBudget.weeklyInviteLimit(false), INVITE_WEEKLY_LIMIT_FREE);
  assert.equal(RateBudget.weeklyInviteLimit(true), INVITE_WEEKLY_LIMIT_PAID);
  assert.equal(INVITE_WEEKLY_LIMIT_FREE, 130);
  assert.equal(INVITE_WEEKLY_LIMIT_PAID, 150);
});

test("daily safe invite limit is 20 and DM safe limit is 40", () => {
  const budget = new RateBudget();
  for (let i = 0; i < INVITE_DAILY_SAFE_LIMIT; i++) budget.record("acc-1", "invite", now);
  assert.equal(budget.check("acc-1", "invite", { now }).allowed, false);
  assert.equal(budget.check("acc-1", "invite", { now }).limit, 20);

  for (let i = 0; i < DM_DAILY_SAFE_LIMIT; i++) budget.record("acc-1", "message", now);
  assert.equal(budget.check("acc-1", "message", { now }).allowed, false);
});

test("weekly invites are a rolling 7 days", () => {
  const budget = new RateBudget();
  const old = new Date("2026-11-02T10:00:00.000Z"); // 8 days before `now`
  for (let i = 0; i < 130; i++) budget.record("acc-1", "invite", old);
  assert.equal(budget.weeklyInviteCount("acc-1", now), 0);
  assert.equal(budget.check("acc-1", "invite", { now }).allowed, true);

  for (let i = 0; i < 130; i++) budget.record("acc-1", "invite", now);
  const check = budget.check("acc-1", "invite", { now });
  assert.equal(check.allowed, false);
  assert.equal(check.used, 130);
  assert.ok(check.resetAt?.startsWith("2026-11-17"));
});

test("a server 429 blocks until its resetAt", () => {
  const budget = new RateBudget();
  budget.applyRateLimit("acc-1", "message", {
    limit: 25,
    used: 25,
    scope: "day",
    resetAt: "2026-11-11T00:00:00.000Z",
  });
  const check = budget.check("acc-1", "message", { now });
  assert.equal(check.allowed, false);
  assert.equal(check.resetAt, "2026-11-11T00:00:00.000Z");
  assert.equal(RateBudget.fromRateLimit("message", { limit: 25, used: 25, scope: "day", resetAt: null }).allowed, false);
});

test("import daily limits are 2500 (Sales Navigator) / 1000 (standard)", () => {
  assert.equal(IMPORT_DAILY_LIMIT_SALES_NAVIGATOR, 2500);
  assert.equal(RateBudget.localLimit("import", false), 1000);
});
