"use client";

import { useState, useCallback, useMemo } from "react";

interface UseSelectionOptions {
  initialSelected?: string[];
}

interface UseSelectionReturn {
  selectedIds: string[];
  isSelected: (id: string) => boolean;
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  selectRange: (ids: string[], startId: string, endId: string) => void;
  clear: () => void;
  selectedCount: number;
}

export function useSelection(
  options: UseSelectionOptions = {}
): UseSelectionReturn {
  const { initialSelected = [] } = options;
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected);

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  );

  const select = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const deselect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const selectRange = useCallback(
    (ids: string[], startId: string, endId: string) => {
      const startIndex = ids.indexOf(startId);
      const endIndex = ids.indexOf(endId);

      if (startIndex === -1 || endIndex === -1) return;

      const [from, to] =
        startIndex < endIndex
          ? [startIndex, endIndex]
          : [endIndex, startIndex];

      const rangeIds = ids.slice(from, to + 1);

      setSelectedIds((prev) => {
        const newSet = new Set([...prev, ...rangeIds]);
        return Array.from(newSet);
      });
    },
    []
  );

  const clear = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);

  return {
    selectedIds,
    isSelected,
    select,
    deselect,
    toggle,
    selectAll,
    selectRange,
    clear,
    selectedCount,
  };
}
