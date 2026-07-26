import { describe, expect, it } from "vitest";

import {
  buildInternalStoragePath,
  validateSourceUpload,
} from "@/lib/uploads/validation";

describe("validateSourceUpload", () => {
  it("accepts a valid PDF", () => {
    const result = validateSourceUpload({
      originalFilename: "Sermon Notes.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fileType).toBe("pdf");
      expect(result.extension).toBe("pdf");
    }
  });

  it("rejects executables and unsupported types", () => {
    expect(
      validateSourceUpload({
        originalFilename: "malware.exe",
        mimeType: "application/octet-stream",
        fileSize: 100,
      }).ok,
    ).toBe(false);

    expect(
      validateSourceUpload({
        originalFilename: "notes.rtf",
        mimeType: "application/rtf",
        fileSize: 100,
      }).ok,
    ).toBe(false);
  });

  it("rejects MIME mismatches", () => {
    const result = validateSourceUpload({
      originalFilename: "chapter.pdf",
      mimeType: "video/mp4",
      fileSize: 2048,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects oversized documents", () => {
    const result = validateSourceUpload({
      originalFilename: "huge.pdf",
      mimeType: "application/pdf",
      fileSize: 51 * 1024 * 1024,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/too large/i);
    }
  });

  it("sanitizes original filenames", () => {
    const result = validateSourceUpload({
      originalFilename: "../../odd name!!.pdf",
      mimeType: "application/pdf",
      fileSize: 1000,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.safeOriginalFilename.includes("..")).toBe(false);
      expect(result.safeOriginalFilename.endsWith(".pdf")).toBe(true);
    }
  });
});

describe("buildInternalStoragePath", () => {
  it("builds a user-scoped safe path", () => {
    const path = buildInternalStoragePath({
      userId: "11111111-1111-1111-1111-111111111111",
      projectId: "22222222-2222-2222-2222-222222222222",
      objectId: "33333333-3333-3333-3333-333333333333",
      extension: "pdf",
    });
    expect(path).toBe(
      "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333.pdf",
    );
  });

  it("strips unsafe characters from path segments", () => {
    const path = buildInternalStoragePath({
      userId: "user/../id",
      projectId: "proj;id",
      objectId: "obj id",
      extension: "PDF",
    });
    expect(path.includes("..")).toBe(false);
    expect(path.endsWith(".pdf")).toBe(true);
  });
});
