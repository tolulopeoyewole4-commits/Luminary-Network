"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_CLIP_EXPORT_PRESETS,
  parseClipExportPresets,
  type ClipExportPresets,
} from "@/lib/clips/export-presets";

const STORAGE_KEY = "luminary.clipExportPresets.v1";

type ExportPresetContextValue = {
  presets: ClipExportPresets;
  setPresets: (next: ClipExportPresets) => void;
  hasCaptions: boolean;
  brandName: string | null;
};

const ExportPresetContext = createContext<ExportPresetContextValue | null>(
  null,
);

export function ExportPresetProvider({
  children,
  hasCaptions,
  brandName,
  initialPresets,
}: {
  children: ReactNode;
  hasCaptions: boolean;
  brandName: string | null;
  initialPresets?: Partial<ClipExportPresets>;
}) {
  const [presets, setPresetsState] = useState<ClipExportPresets>(() =>
    parseClipExportPresets({
      ...DEFAULT_CLIP_EXPORT_PRESETS,
      ...initialPresets,
      // Prefer captions off when none exist so first export does not fail.
      burnCaptions: hasCaptions
        ? (initialPresets?.burnCaptions ??
          DEFAULT_CLIP_EXPORT_PRESETS.burnCaptions)
        : false,
      brandStamp: brandName
        ? (initialPresets?.brandStamp ?? DEFAULT_CLIP_EXPORT_PRESETS.brandStamp)
        : false,
    }),
  );

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ClipExportPresets>;
      setPresetsState(
        parseClipExportPresets({
          ...parsed,
          burnCaptions: hasCaptions ? Boolean(parsed.burnCaptions) : false,
          brandStamp: brandName ? Boolean(parsed.brandStamp) : false,
        }),
      );
    } catch {
      // Ignore malformed session storage.
    }
  }, [brandName, hasCaptions]);

  function setPresets(next: ClipExportPresets) {
    const normalized = parseClipExportPresets({
      ...next,
      burnCaptions: hasCaptions ? next.burnCaptions : false,
      brandStamp: brandName ? next.brandStamp : false,
    });
    setPresetsState(normalized);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Private mode / quota — presets still work for this view.
    }
  }

  return (
    <ExportPresetContext.Provider
      value={{ presets, setPresets, hasCaptions, brandName }}
    >
      {children}
    </ExportPresetContext.Provider>
  );
}

export function useExportPresets(): ExportPresetContextValue {
  const value = useContext(ExportPresetContext);
  if (!value) {
    throw new Error("useExportPresets must be used within ExportPresetProvider");
  }
  return value;
}

export function useExportPresetsOptional(): ExportPresetContextValue | null {
  return useContext(ExportPresetContext);
}
