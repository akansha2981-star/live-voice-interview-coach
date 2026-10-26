import { describe, expect, it } from "vitest";
import { isEventCategory, prepBySlug, safeUrl } from "./prep";

describe("prep material", () => {
  it("masterclasses are events, SOPs are documents", () => {
    expect(isEventCategory("Masterclass")).toBe(true);
    expect(isEventCategory("SOP")).toBe(false);
  });
  it("maps slugs to stored categories", () => { expect(prepBySlug("gdpi")?.category).toBe("GDPI Docket"); expect(prepBySlug("nope")).toBeUndefined(); });
  it("rejects non-web links", () => { expect(safeUrl("javascript:alert(1)")).toBeNull(); expect(safeUrl("https://x.com/r")).toBe("https://x.com/r"); });
});
