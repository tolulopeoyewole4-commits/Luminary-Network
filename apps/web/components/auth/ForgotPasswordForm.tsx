"use client";

import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import {
  hasFieldErrors,
  validateForgotPasswordForm,
  type AuthFieldErrors,
} from "@/lib/auth/validation";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    const errors = validateForgotPasswordForm({ email });
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;

    if (!isSupabaseConfigured()) {
      setFormError(
        "Supabase is not configured. Add environment variables before resetting a password.",
      );
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${getAppUrl()}/auth/callback?next=/settings`,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      setSuccess(
        "If an account exists for that email, a reset link has been sent.",
      );
    } catch {
      setFormError("Unable to send a reset email right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

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

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Sending reset link…" : "Send reset link"}
      </button>
    </form>
  );
}
