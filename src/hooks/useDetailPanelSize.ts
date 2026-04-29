"use client";

import { useState, useEffect } from "react";

export type DetailPanelSize = "narrow" | "medium" | "wide";

const STORAGE_KEY = "detailPanelSize";
const DEFAULT: DetailPanelSize = "narrow";

const SIZE_CLASSES: Record<DetailPanelSize, string> = {
  narrow: "w-full sm:max-w-lg",
  medium: "w-full sm:max-w-2xl",
  wide:   "w-full sm:max-w-4xl",
};

export function useDetailPanelSize() {
  const [size, setSize] = useState<DetailPanelSize>(DEFAULT);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as DetailPanelSize | null;
    if (stored && stored in SIZE_CLASSES) setSize(stored);
  }, []);

  const updateSize = (next: DetailPanelSize) => {
    setSize(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return { size, sizeClass: SIZE_CLASSES[size], updateSize, SIZE_CLASSES };
}
