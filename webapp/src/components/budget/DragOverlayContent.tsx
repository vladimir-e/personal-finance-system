import type { Category } from 'pfs-lib';
import { GripVerticalIcon } from '../icons';

export function DragOverlayContent({ category }: { category: Category }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-edge bg-surface px-4 py-2 shadow-lg">
      <GripVerticalIcon className="h-4 w-4 text-muted" />
      <span className="text-sm font-medium text-heading">{category.name}</span>
    </div>
  );
}
