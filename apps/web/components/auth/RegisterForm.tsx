"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import {
  hasFieldErrors,
  validateRegisterForm,
  type AuthFieldErrors,
} from "@/lib/auth/validation";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    const errors = validateRegisterForm({
      email,
      password,
      confirmPassword,
      fullName,
    });
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;

    if (!isSupabaseConfigured()) {
      setFormError(
        "Supabase is not configured. Add environment variables before registering.",
      );
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${getAppUrl()}/auth/callback`,
          data: {
            full_name: fullName.trim(),
            display_name: fullName.trim(),
          },
        },
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setSuccess(
        "Account created. Check your email to verify your address, then sign in.",
      );
    } catch {
      setFormError("Unable to register right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <div>
        <label htmlFor="fullName" className="field-label">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          className="field-input"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          disabled={loading}
          required
        />
        {fieldErrors.fullName ? (
          <p className="field-error">{fieldErrors.fullName}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="field-input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          required
        />
        {fieldErrors.email ? (
          <p className="field-error">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="field-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
          required
        />
        {fieldErrors.password ? (
          <p className="field-error">{fieldErrors.password}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="field-label">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="field-input"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={loading}
          required
        />
        {fieldErrors.confirmPassword ? (
          <p className="field-error">{fieldErrors.confirmPassword}</p>
        ) : null}
      </div>

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
