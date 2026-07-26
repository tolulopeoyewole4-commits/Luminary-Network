"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ProcessingAutoRefreshProps = {
  active: boolean;
  intervalMs?: number;
};

/** Polls router.refresh while a background job/file is processing. */
export function ProcessingAutoRefresh({
  active,
  intervalMs = 4000,
}: ProcessingAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [active, intervalMs, router]);

  return null;
}
