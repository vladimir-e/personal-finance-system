import { useState, useCallback, useRef } from 'react';

export function useMultiSelect(visibleIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const anchorRef = useRef<string | null>(null);

  const toggle = useCallback((id: string, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);

      if (shiftKey && anchorRef.current) {
        const anchorIdx = visibleIds.indexOf(anchorRef.current);
        const targetIdx = visibleIds.indexOf(id);
        if (anchorIdx !== -1 && targetIdx !== -1) {
          const start = Math.min(anchorIdx, targetIdx);
          const end = Math.max(anchorIdx, targetIdx);
          for (let i = start; i <= end; i++) {
            next.add(visibleIds[i]);
          }
          return next;
        }
      }

      // Normal toggle
      if (next.has(id)) next.delete(id);
      else next.add(id);
      anchorRef.current = id;
      return next;
    });
  }, [visibleIds]);

  const selectAll = useCallback(() => {
    setSelectedIds(prev => {
      const allSelected = visibleIds.length > 0 && visibleIds.every(id => prev.has(id));
      if (allSelected) return new Set();
      return new Set(visibleIds);
    });
  }, [visibleIds]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    anchorRef.current = null;
  }, []);

  return { selectedIds, toggle, selectAll, clear };
}
