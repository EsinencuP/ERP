"use client";
import { closestCenter, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors, type CollisionDetection, type KeyboardCoordinateGetter } from "@dnd-kit/core";

/** Share the CRM board's column-only collision rules and adjacent-column keyboard navigation. */
export function createKanbanDnd<T extends string>({ statuses, columnId, columnStatus, status, activeKey, boardSelector }: { statuses: readonly T[]; columnId: (value: T) => string; columnStatus: (value: unknown) => T | null; status: (value: unknown) => T | null; activeKey: string; boardSelector: string }) {
  const collisionDetection: CollisionDetection = (args) => {
    const columns = args.droppableContainers.filter((container) => columnStatus(container.id) !== null), pointer = args.pointerCoordinates;
    const viewport = columns[0]?.node.current?.closest(boardSelector)?.getBoundingClientRect();
    if (pointer && viewport && (pointer.x < viewport.left || pointer.x > viewport.right || pointer.y < viewport.top || pointer.y > viewport.bottom)) return [];
    const scoped = { ...args, droppableContainers: columns };
    return pointer ? pointerWithin(scoped) : closestCenter(scoped);
  };
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
    if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return;
    event.preventDefault();
    const current = columnStatus(context.over?.id) ?? status(context.active?.data.current?.[activeKey]);
    if (!current || !context.collisionRect) return;
    const next = statuses[statuses.indexOf(current) + (event.code === "ArrowRight" ? 1 : -1)];
    if (!next) return;
    const rect = context.droppableRects.get(columnId(next)); if (!rect) return;
    return { x: currentCoordinates.x + rect.left + rect.width / 2 - context.collisionRect.left - context.collisionRect.width / 2, y: currentCoordinates.y + rect.top + rect.height / 2 - context.collisionRect.top - context.collisionRect.height / 2 };
  };
  return { collisionDetection, keyboardCoordinates };
}

/** Reuse identical pointer activation and keyboard sensors across CRM and Projects boards. */
export function useKanbanSensors(coordinateGetter: KeyboardCoordinateGetter) { return useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 7 } }), useSensor(KeyboardSensor, { coordinateGetter })); }
