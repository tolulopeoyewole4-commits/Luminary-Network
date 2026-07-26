"use client";

import { CopyExportButton } from "@/components/ui/CopyExportButton";
import { downloadGeneratedContentAction } from "@/lib/content/export-actions";

type CopyContentButtonProps = {
  contentId: string;
  format: "md" | "txt";
  label?: string;
};

export function CopyContentButton({
  contentId,
  format,
  label,
}: CopyContentButtonProps) {
  return (
    <CopyExportButton
      label={
        label || (format === "txt" ? "Copy text" : "Copy Markdown")
      }
      loadContent={async () => {
        const result = await downloadGeneratedContentAction({
          contentId,
          format,
        });
        if (!result.ok || !result.content) {
          return {
            ok: false,
            error: result.ok ? "Missing export content." : result.error,
          };
        }
        return { ok: true, content: result.content };
      }}
    />
  );
}
