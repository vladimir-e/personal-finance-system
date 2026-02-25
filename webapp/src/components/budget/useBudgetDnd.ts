import { useState, useCallback } from 'react';
import {
  useSensors,
  useSensor,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import type { Category } from 'pfs-lib';
import { computeReorder, ARCHIVED_GROUP } from '../../utils/computeReorder';

export type ContainerItems = Map<string, string[]>;

export function useBudgetDnd(
  categories: Category[],
  reorderCategories: (updates: Array<{ id: string; changes: Partial<Category> }>) => void,
) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [activeItem, setActiveItem] = useState<Category | null>(null);
  const [containerItems, setContainerItems] = useState<ContainerItems | null>(null);

  const buildContainerItems = useCallback((): ContainerItems => {
    const map = new Map<string, string[]>();
    const active = categories.filter((c) => !c.archived);
    const archived = categories.filter((c) => c.archived);

    // Group active categories
    for (const cat of active) {
      const group = cat.group;
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(cat.id);
    }

    // Sort each group by sortOrder
    for (const [group, ids] of map) {
      const sorted = ids.sort((a, b) => {
        const catA = categories.find((c) => c.id === a)!;
        const catB = categories.find((c) => c.id === b)!;
        return catA.sortOrder - catB.sortOrder;
      });
      map.set(group, sorted);
    }

    // Archived group
    const archivedIds = archived
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => c.id);
    map.set(ARCHIVED_GROUP, archivedIds);

    return map;
  }, [categories]);

  const findContainer = useCallback(
    (id: string, items: ContainerItems): string | undefined => {
      // Check if id is a container name
      if (items.has(id)) return id;
      // Find which container holds this item
      for (const [container, ids] of items) {
        if (ids.includes(id)) return container;
      }
      return undefined;
    },
    [],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const cat = categories.find((c) => c.id === event.active.id);
      if (!cat) return;
      setActiveItem(cat);
      setContainerItems(buildContainerItems());
    },
    [categories, buildContainerItems],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !containerItems) return;

      const activeContainer = findContainer(String(active.id), containerItems);
      const overContainer = findContainer(String(over.id), containerItems);

      if (!activeContainer || !overContainer || activeContainer === overContainer) return;

      setContainerItems((prev) => {
        if (!prev) return prev;
        const next = new Map(prev);

        const sourceIds = [...(next.get(activeContainer) ?? [])];
        const targetIds = [...(next.get(overContainer) ?? [])];

        const activeIdx = sourceIds.indexOf(String(active.id));
        if (activeIdx === -1) return prev;

        // Remove from source
        sourceIds.splice(activeIdx, 1);

        // Insert into target at over position
        const overIdx = targetIds.indexOf(String(over.id));
        if (overIdx !== -1) {
          targetIds.splice(overIdx, 0, String(active.id));
        } else {
          // Dropped on the container itself (not on an item)
          targetIds.push(String(active.id));
        }

        next.set(activeContainer, sourceIds);
        next.set(overContainer, targetIds);
        return next;
      });
    },
    [containerItems, findContainer],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!containerItems || !activeItem) {
        setActiveItem(null);
        setContainerItems(null);
        return;
      }

      const activeContainer = findContainer(String(active.id), containerItems);
      if (!activeContainer) {
        setActiveItem(null);
        setContainerItems(null);
        return;
      }

      // Handle within-container reorder
      if (over) {
        const overContainer = findContainer(String(over.id), containerItems);
        if (overContainer && activeContainer === overContainer) {
          const ids = containerItems.get(activeContainer)!;
          const oldIdx = ids.indexOf(String(active.id));
          const newIdx = ids.indexOf(String(over.id));
          if (oldIdx !== newIdx) {
            const reordered = arrayMove(ids, oldIdx, newIdx);
            containerItems.set(activeContainer, reordered);
          }
        }
      }

      // Determine source group from the original category
      const sourceGroup = activeItem.archived ? ARCHIVED_GROUP : activeItem.group;

      const targetOrder = containerItems.get(activeContainer) ?? [];
      const sourceOrder =
        sourceGroup !== activeContainer ? (containerItems.get(sourceGroup) ?? []) : [];

      const patches = computeReorder({
        categories,
        activeId: String(active.id),
        targetGroup: activeContainer,
        targetOrder,
        sourceGroup,
        sourceOrder,
      });

      if (patches.length > 0) {
        reorderCategories(patches);
      }

      setActiveItem(null);
      setContainerItems(null);
    },
    [containerItems, activeItem, categories, reorderCategories, findContainer],
  );

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
    setContainerItems(null);
  }, []);

  return {
    sensors,
    activeItem,
    containerItems,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
