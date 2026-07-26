"use client";

import { CopyExportButton } from "@/components/ui/CopyExportButton";
import { downloadCourseMarkdownAction } from "@/lib/courses/export-actions";

type CopyCourseButtonProps = {
  courseId: string;
  label?: string;
};

export function CopyCourseButton({
  courseId,
  label = "Copy Markdown",
}: CopyCourseButtonProps) {
  return (
    <CopyExportButton
      label={label}
      loadContent={async () => {
        const result = await downloadCourseMarkdownAction(courseId);
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
