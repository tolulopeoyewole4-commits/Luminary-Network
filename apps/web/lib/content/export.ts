import type { GeneratedContent } from "@/types/database";

function slugifyFilename(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "content";
}

function formatReferences(
  references: GeneratedContent["source_references"],
): string {
  if (!references?.length) return "";
  return references
    .map((ref) => {
      const pages =
        ref.pageStart != null || ref.pageEnd != null
          ? ` (pp. ${ref.pageStart ?? "?"}${
              ref.pageEnd != null && ref.pageEnd !== ref.pageStart
                ? `–${ref.pageEnd}`
                : ""
            })`
          : "";
      return `- ${ref.sectionTitle}${pages}`;
    })
    .join("\n");
}

/** Build a portable Markdown document for one social/content item. */
export function buildContentMarkdown(item: GeneratedContent): string {
  const parts: string[] = [`# ${item.title.trim() || "Untitled content"}`, ""];

  const meta: string[] = [];
  if (item.platform) meta.push(`- **Platform:** ${item.platform}`);
  if (item.content_type) meta.push(`- **Type:** ${item.content_type}`);
  if (item.tone) meta.push(`- **Tone:** ${item.tone}`);
  if (item.length_label) meta.push(`- **Length:** ${item.length_label}`);
  if (item.target_audience?.trim()) {
    meta.push(`- **Audience:** ${item.target_audience.trim()}`);
  }
  if (meta.length) {
    parts.push("## Details", "", ...meta, "");
  }

  parts.push("## Body", "", item.body.trim() || "_(empty)_", "");

  if (item.call_to_action?.trim()) {
    parts.push("## Call to action", "", item.call_to_action.trim(), "");
  }

  const refs = formatReferences(item.source_references);
  if (refs) {
    parts.push("## Source references", "", refs, "");
  }

  parts.push("---", "", "_Exported from Luminary AI_", "");
  return parts.join("\n");
}

/** Plain-text body-first export for pasting into social tools. */
export function buildContentPlainText(item: GeneratedContent): string {
  const parts: string[] = [];
  if (item.title.trim()) parts.push(item.title.trim(), "");
  parts.push(item.body.trim());
  if (item.call_to_action?.trim()) {
    parts.push("", item.call_to_action.trim());
  }
  parts.push("");
  return parts.join("\n");
}

export function contentExportFilename(
  title: string,
  format: "md" | "txt",
): string {
  return `${slugifyFilename(title)}.${format}`;
}
