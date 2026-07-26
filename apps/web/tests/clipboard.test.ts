import { afterEach, describe, expect, it, vi } from "vitest";

import { copyTextToClipboard } from "@/lib/clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("copyTextToClipboard", () => {
  it("uses navigator.clipboard.writeText when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    await copyTextToClipboard("hello luminary");
    expect(writeText).toHaveBeenCalledWith("hello luminary");
  });

  it("falls back to execCommand when clipboard API is missing", async () => {
    vi.stubGlobal("navigator", {});
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(true),
    });

    await copyTextToClipboard("fallback copy");
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("throws when neither clipboard API nor execCommand works", async () => {
    vi.stubGlobal("navigator", {});
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(false),
    });

    await expect(copyTextToClipboard("nope")).rejects.toThrow(
      /Unable to copy to the clipboard/,
    );
  });
});
