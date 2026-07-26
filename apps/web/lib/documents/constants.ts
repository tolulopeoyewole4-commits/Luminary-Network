export const DOCUMENT_PROCESSABLE_TYPES = ["pdf", "docx", "txt"] as const;

export type DocumentProcessableType =
  (typeof DOCUMENT_PROCESSABLE_TYPES)[number];

export function isDocumentProcessableType(
  value: string,
): value is DocumentProcessableType {
  return (DOCUMENT_PROCESSABLE_TYPES as readonly string[]).includes(value);
}
