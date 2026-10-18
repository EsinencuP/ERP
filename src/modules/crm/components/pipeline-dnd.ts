"use client";

import { closestCenter, pointerWithin, type CollisionDetection, type KeyboardCoordinateGetter } from "@dnd-kit/core";
import { DEAL_STAGES } from "../schema";
import { getPipelineColumnId, getPipelineColumnStage, getPipelineStage } from "../pipeline";

/** Resolve only column drop zones; releasing the pointer outside the board cancels a move. */
export const pipelineCollisionDetection: CollisionDetection = (args) => {
  const columns = args.droppableContainers.filter((container) => getPipelineColumnStage(container.id) !== null);
  const pointer = args.pointerCoordinates;
  const viewport = columns[0]?.node.current?.closest("[data-pipeline-board]")?.getBoundingClientRect();
  if (pointer && viewport && (pointer.x < viewport.left || pointer.x > viewport.right || pointer.y < viewport.top || pointer.y > viewport.bottom)) return [];
  const scoped = { ...args, droppableContainers: columns };
  return args.pointerCoordinates ? pointerWithin(scoped) : closestCenter(scoped);
};

/** Move keyboard drags between adjacent columns, including columns without sortable cards. */
export const pipelineKeyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return;
  event.preventDefault();
  const current = getPipelineColumnStage(context.over?.id) ?? getPipelineStage(context.active?.data.current?.stage);
  if (!current || !context.collisionRect) return;
  const next = DEAL_STAGES[DEAL_STAGES.indexOf(current) + (event.code === "ArrowRight" ? 1 : -1)];
  if (!next) return;
  const rect = context.droppableRects.get(getPipelineColumnId(next));
  if (!rect) return;
  return {
    x: currentCoordinates.x + rect.left + rect.width / 2 - context.collisionRect.left - context.collisionRect.width / 2,
    y: currentCoordinates.y + rect.top + rect.height / 2 - context.collisionRect.top - context.collisionRect.height / 2,
  };
};
