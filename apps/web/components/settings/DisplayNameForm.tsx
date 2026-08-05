"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateDisplayNameAction } from "@/lib/profiles/actions";

type DisplayNameFormProps = {
  initialDisplayName: string;
};

export function DisplayNameForm({ initialDisplayName }: DisplayNameFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await updateDisplayNameAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage(result.message);
          router.refresh();
        });
      }}
    >
      <div>
        <label htmlFor="display_name" className="field-label">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          className="field-input"
          defaultValue={initialDisplayName}
          maxLength={48}
          required
          disabled={pending}
          placeholder="Creator name for reel brand stamps"
        />
        <p className="mt-1 text-xs text-muted">
          Used as the identity stamp on exported Reels / Shorts / TikTok clips.
        </p>
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save display name"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? (
        <p className="text-sm text-[var(--accent-strong)]">{message}</p>
      ) : null}
    </form>
  );
}
