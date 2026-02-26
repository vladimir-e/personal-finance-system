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
import {
  buildContainerItems as buildItems,
  findContainer as findCtr,
  type ContainerItems,
} from '../../utils/dndHelpers';

export type { ContainerItems };

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

  const buildContainerItems = useCallback(
    () => buildItems(categories),
    [categories],
  );

  const findContainer = useCallback(
    (id: string, items: ContainerItems) => findCtr(id, items),
    [],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = String(event.active.id);
      const cat = categories.find((c) => c.id === activeId);
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

      // Determine source group from the original category
      const sourceGroup = activeItem.archived ? ARCHIVED_GROUP : activeItem.group;

      // Handle within-container reorder (only when drag stayed in the same container)
      let targetOrder = containerItems.get(activeContainer) ?? [];
      if (over && sourceGroup === activeContainer) {
        const overContainer = findContainer(String(over.id), containerItems);
        if (overContainer && activeContainer === overContainer) {
          const ids = [...targetOrder];
          const oldIdx = ids.indexOf(String(active.id));
          const newIdx = ids.indexOf(String(over.id));
          if (oldIdx >= 0 && newIdx >= 0 && oldIdx !== newIdx) {
            targetOrder = arrayMove(ids, oldIdx, newIdx);
          }
        }
      }
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
