import { describe, expect, it } from "vitest";

import { isAuthPath, isProtectedPath } from "@/lib/auth/routes";

describe("route helpers", () => {
  it("marks dashboard and settings as protected", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/extra")).toBe(true);
    expect(isProtectedPath("/settings")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });

  it("recognises auth paths", () => {
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/register")).toBe(true);
    expect(isAuthPath("/forgot-password")).toBe(true);
    expect(isAuthPath("/auth/callback")).toBe(true);
    expect(isAuthPath("/dashboard")).toBe(false);
  });
});
