"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import type { DocumentSection } from "@/types/database";

type DocumentSectionViewerProps = {
  sections: DocumentSection[];
};

function pageLabel(section: DocumentSection): string | null {
  if (section.page_start == null) return null;
  if (section.page_end == null || section.page_end === section.page_start) {
    return `Page ${section.page_start}`;
  }
  return `Pages ${section.page_start}–${section.page_end}`;
}

export function DocumentSectionViewer({ sections }: DocumentSectionViewerProps) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(
    sections[0]?.id ?? null,
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sections;
    return sections.filter((section) => {
      return (
        section.section_title.toLowerCase().includes(normalized) ||
        section.extracted_text.toLowerCase().includes(normalized)
      );
    });
  }, [query, sections]);

  const active =
    filtered.find((section) => section.id === activeId) ?? filtered[0] ?? null;

  if (sections.length === 0) {
    return (
      <EmptyState
        title="No extracted sections"
        description="Run text extraction on this document to review chapters, pages, and source references."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="surface-card p-4">
        <label htmlFor="section-search" className="field-label">
          Search sections
        </label>
        <input
          id="section-search"
          className="field-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles or text"
        />
        <ul className="mt-4 max-h-[28rem] space-y-1 overflow-y-auto">
          {filtered.map((section) => {
            const selected = active?.id === section.id;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(section.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    selected
                      ? "bg-[var(--accent)] text-white"
                      : "hover:bg-white"
                  }`}
                >
                  <span className="block font-semibold">
                    {section.section_number}. {section.section_title}
                  </span>
                  <span
                    className={`mt-1 block text-xs ${selected ? "text-white/80" : "text-muted"}`}
                  >
                    {pageLabel(section) ?? "No page reference"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <article className="surface-card px-6 py-6">
        {active ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
                  Section {active.section_number}
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                  {active.section_title}
                </h2>
              </div>
              <div className="text-right text-sm text-muted">
                <p>{pageLabel(active) ?? "Source pages unavailable"}</p>
                <p>{active.token_count} tokens (approx.)</p>
              </div>
            </div>
            <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
              {active.extracted_text || "This section has no extracted body text."}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">No sections match your search.</p>
        )}
      </article>
    </div>
  );
}
