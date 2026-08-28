// Tests for the in-memory rate limiter.

import { describe, expect, it } from "bun:test";
import { _reset, charge, clientKey } from "./rate_limit";

describe("rate_limit.charge", () => {
  it("allows up to `max` requests, then 429s", () => {
    _reset();
    for (let i = 0; i < 5; i++) {
      const r = charge("test-key", { max: 5, windowMs: 60_000 });
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(4 - i);
    }
    const blocked = charge("test-key", { max: 5, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("isolates buckets per key", () => {
    _reset();
    charge("a", { max: 1, windowMs: 60_000 });
    const aBlocked = charge("a", { max: 1, windowMs: 60_000 });
    const bAllowed = charge("b", { max: 1, windowMs: 60_000 });
    expect(aBlocked.ok).toBe(false);
    expect(bAllowed.ok).toBe(true);
  });

  it("resets after window expires", () => {
    _reset();
    charge("k", { max: 1, windowMs: 50 });
    expect(charge("k", { max: 1, windowMs: 50 }).ok).toBe(false);
    // Manually expire the bucket.
    const t = Date.now() + 100;
    while (Date.now() < t) {
      // spin briefly
    }
    expect(charge("k", { max: 1, windowMs: 50 }).ok).toBe(true);
  });
});

describe("clientKey", () => {
  it("returns 'local' when no forwarded header is present", () => {
    const req = new Request("http://localhost/");
    expect(clientKey(req)).toBe("local");
  });

  it("uses first X-Forwarded-For entry when present", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientKey(req)).toBe("1.2.3.4");
  });
});
