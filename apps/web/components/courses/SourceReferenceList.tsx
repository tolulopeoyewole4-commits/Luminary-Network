import type { CourseSourceReference } from "@/types/database";

export function SourceReferenceList({
  references,
}: {
  references: CourseSourceReference[];
}) {
  if (!references?.length) {
    return <p className="text-sm text-muted">No source references stored.</p>;
  }

  return (
    <ul className="space-y-1 text-sm text-muted">
      {references.map((reference) => {
        const pages =
          reference.pageStart == null
            ? "page n/a"
            : reference.pageEnd && reference.pageEnd !== reference.pageStart
              ? `pages ${reference.pageStart}–${reference.pageEnd}`
              : `page ${reference.pageStart}`;

        return (
          <li key={`${reference.sectionId}-${reference.sectionNumber}`}>
            Section {reference.sectionNumber}: {reference.sectionTitle} ({pages})
          </li>
        );
      })}
    </ul>
  );
}
