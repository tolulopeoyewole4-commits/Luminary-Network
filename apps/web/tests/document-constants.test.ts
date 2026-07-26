import { describe, expect, it } from "vitest";

import {
  DOCUMENT_PROCESSABLE_TYPES,
  isDocumentProcessableType,
} from "@/lib/documents/constants";

describe("document processable types", () => {
  it("allows pdf, docx, and txt only", () => {
    expect(DOCUMENT_PROCESSABLE_TYPES).toEqual(["pdf", "docx", "txt"]);
    expect(isDocumentProcessableType("pdf")).toBe(true);
    expect(isDocumentProcessableType("mp4")).toBe(false);
  });
});
