import { describe, expect, it } from "vitest";
import { effectiveStatus, filterTab, slugify, sortForFeed } from "./gk";

const a = (id: string, day: number) => ({ id, published_at: `2026-10-${String(day).padStart(2, "0")}T00:00:00Z` });

describe("GK feed ordering", () => {
  it("puts unread newest-first, then read newest-first, without dropping read articles", () => {
    const items = [a("old", 1), a("mid", 5), a("new", 9), a("readNew", 10)];
    const out = sortForFeed(items, new Set(["readNew", "mid"])).map((x) => x.id);
    expect(out).toEqual(["new", "old", "readNew", "mid"]);
  });
  it("saved tab includes saved articles regardless of read status", () => {
    const items = [a("x", 1), a("y", 2)];
    expect(filterTab(items, "saved", new Set(["x"]), new Set(["x", "y"])).length).toBe(2);
    expect(filterTab(items, "unread", new Set(["x"]), new Set()).map((i) => i.id)).toEqual(["y"]);
  });
});

describe("GK helpers", () => {
  it("builds URL slugs", () => expect(slugify("RBI Repo Rate: 6.5% Hold!")).toBe("rbi-repo-rate-65-hold"));
  it("treats past-due scheduled posts as published", () => {
    expect(effectiveStatus("scheduled", "2026-01-01T00:00:00Z", Date.parse("2026-02-01"))).toBe("published");
    expect(effectiveStatus("scheduled", "2026-03-01T00:00:00Z", Date.parse("2026-02-01"))).toBe("scheduled");
  });
});
