"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import {
  DEFAULT_CLIP_EXPORT_PRESETS,
  parseClipExportPresets,
  type ClipExportPresets,
} from "@/lib/clips/export-presets";

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

  function setPresets(next: ClipExportPresets) {
    setPresetsState(
      parseClipExportPresets({
        ...next,
        burnCaptions: hasCaptions ? next.burnCaptions : false,
        brandStamp: brandName ? next.brandStamp : false,
      }),
    );
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
