import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue transforming knowledge into courses and content."
      footer={
        <>
          New to Luminary AI?{" "}
          <Link href="/register" className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
