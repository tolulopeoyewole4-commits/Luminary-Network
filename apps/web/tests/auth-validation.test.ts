import { describe, expect, it } from "vitest";

import {
  hasFieldErrors,
  validateForgotPasswordForm,
  validateLoginForm,
  validateRegisterForm,
} from "@/lib/auth/validation";

describe("validateLoginForm", () => {
  it("requires email and password", () => {
    const errors = validateLoginForm({ email: "", password: "" });
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();
    expect(hasFieldErrors(errors)).toBe(true);
  });

  it("rejects invalid email and short passwords", () => {
    const errors = validateLoginForm({
      email: "not-an-email",
      password: "short",
    });
    expect(errors.email).toMatch(/valid email/i);
    expect(errors.password).toMatch(/8 characters/i);
  });

  it("accepts a valid login payload", () => {
    const errors = validateLoginForm({
      email: "creator@example.com",
      password: "securepass",
    });
    expect(hasFieldErrors(errors)).toBe(false);
  });
});

describe("validateRegisterForm", () => {
  it("requires matching passwords and a full name", () => {
    const errors = validateRegisterForm({
      email: "creator@example.com",
      password: "securepass",
      confirmPassword: "different",
      fullName: "",
    });
    expect(errors.fullName).toBeTruthy();
    expect(errors.confirmPassword).toMatch(/do not match/i);
  });

  it("accepts a valid registration payload", () => {
    const errors = validateRegisterForm({
      email: "creator@example.com",
      password: "securepass",
      confirmPassword: "securepass",
      fullName: "Ada Creator",
    });
    expect(hasFieldErrors(errors)).toBe(false);
  });
});

describe("validateForgotPasswordForm", () => {
  it("requires a valid email", () => {
    expect(validateForgotPasswordForm({ email: "" }).email).toBeTruthy();
    expect(
      validateForgotPasswordForm({ email: "creator@example.com" }).email,
    ).toBeUndefined();
  });
});
