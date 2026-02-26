import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface DragHandleProps {
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners: Record<string, Function> | undefined;
}

export function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (props: { dragHandleProps: DragHandleProps; isDragging: boolean }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({
        dragHandleProps: { attributes, listeners },
        isDragging,
      })}
    </div>
  );
}
