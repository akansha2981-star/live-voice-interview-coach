import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64, clampZoom, dragToBox, isBlockedShortcut, totalFromContentRange, xorBytes } from "@/lib/prep-reader";

describe("prep reader", () => {
  it("masked chunks round-trip back to the original bytes", () => {
    const data = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55, 0, 255]);
    const key = new Uint8Array([9, 200, 3]);
    const masked = xorBytes(data, key);
    expect(Array.from(masked)).not.toEqual(Array.from(data));
    expect(Array.from(xorBytes(base64ToBytes(bytesToBase64(masked)), key))).toEqual(Array.from(data));
  });
  it("zoom stays between 50% and 300%", () => {
    expect(clampZoom(0.1)).toBe(0.5);
    expect(clampZoom(9)).toBe(3);
    expect(clampZoom(1.25)).toBe(1.25);
  });
  it("a drag becomes a normalised mark box and tiny clicks are ignored", () => {
    expect(dragToBox({ x: 0.6, y: 0.5 }, { x: 0.2, y: 0.3 })).toEqual({ x: 0.2, y: 0.3, w: 0.39999999999999997, h: 0.5 - 0.3 });
    expect(dragToBox({ x: 0.5, y: 0.5 }, { x: 0.502, y: 0.501 })).toBeNull();
    expect(dragToBox({ x: -1, y: 0.2 }, { x: 2, y: 0.4 })?.w).toBe(1);
  });
  it("blocks save, print and copy outside notes, but allows copy inside notes", () => {
    expect(isBlockedShortcut({ key: "s", ctrlKey: true, metaKey: false }, false)).toBe(true);
    expect(isBlockedShortcut({ key: "p", ctrlKey: false, metaKey: true }, true)).toBe(true);
    expect(isBlockedShortcut({ key: "c", ctrlKey: true, metaKey: false }, false)).toBe(true);
    expect(isBlockedShortcut({ key: "c", ctrlKey: true, metaKey: false }, true)).toBe(false);
    expect(isBlockedShortcut({ key: "PrintScreen", ctrlKey: false, metaKey: false }, false)).toBe(true);
    expect(isBlockedShortcut({ key: "b", ctrlKey: false, metaKey: false }, false)).toBe(false);
  });
  it("reads the file size from a range response", () => {
    expect(totalFromContentRange("bytes 0-2097151/5242880")).toBe(5242880);
    expect(totalFromContentRange(null)).toBeNull();
  });
});
