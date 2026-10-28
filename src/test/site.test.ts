import { describe, expect, it } from "vitest";
import { SITE_URL, siteUrl } from "@/lib/site";
import { isLive, signedOutTarget } from "@/lib/launch";

describe("Public address", () => {
  it("serves marketing pages from mbacompass.online", () => {
    expect(SITE_URL).toBe("https://mbacompass.online");
    expect(siteUrl("/courses")).toBe("https://mbacompass.online/courses");
    expect(siteUrl("privacy")).toBe("https://mbacompass.online/privacy");
  });

  it("serves the student workspace from /dashboard on that same address", () => {
    expect(siteUrl("/dashboard")).toBe("https://mbacompass.online/dashboard");
    expect(siteUrl("/my-slots")).toBe("https://mbacompass.online/my-slots");
  });
});

describe("Wrong-side hand-off", () => {
  it("sends a signed-out workspace visitor to the public holding page before launch", () => {
    expect(signedOutTarget(false)).toBe("/");
  });

  it("sends them to sign-in once the workspace is live", () => {
    expect(signedOutTarget(true)).toBe("/auth");
  });

  it("is still pre-launch the evening before launch day", () => {
    expect(isLive(new Date("2026-10-28T09:00:00Z"))).toBe(false);
  });
});
