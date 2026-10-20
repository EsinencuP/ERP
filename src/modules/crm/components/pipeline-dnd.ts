"use client";
import { createKanbanDnd } from "@/hooks/use-kanban-dnd";
import { DEAL_STAGES } from "../schema";
import { getPipelineColumnId, getPipelineColumnStage, getPipelineStage } from "../pipeline";

const dnd = createKanbanDnd({ statuses: DEAL_STAGES, columnId: getPipelineColumnId, columnStatus: getPipelineColumnStage, status: getPipelineStage, activeKey: "stage", boardSelector: "[data-pipeline-board]" });
export const pipelineCollisionDetection = dnd.collisionDetection;
export const pipelineKeyboardCoordinates = dnd.keyboardCoordinates;
