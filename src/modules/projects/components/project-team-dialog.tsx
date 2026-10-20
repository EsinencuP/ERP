"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getProjectTeam } from "../actions";
import type { OverviewProject, ProjectTeamMember } from "../overview-types";
import { TaskAssigneeAvatar } from "./task-presentation";

/** Show the complete derived project team in bounded pages, preserving inactive historical assignments. */
export function ProjectTeamDialog({ project, onClose, onReturnFocus }: { project: OverviewProject; onClose: () => void; onReturnFocus: () => void }) {
  const { t } = useI18n();

  const [page, setPage] = useState(1), [data, setData] = useState<Result<PaginatedResponse<ProjectTeamMember>> | null>(null);
  useEffect(() => { let alive = true; setData(null); getProjectTeam(project.id, { page }).then((value) => { if (alive) setData(value); }).catch(() => { if (alive) setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить команду") } }); }); return () => { alive = false; }; }, [project.id, page]);
  return <Dialog open onOpenChange={function handleOpen(open) { if (!open) onClose(); }}><DialogContent className="motion-fade max-h-[90dvh] max-w-lg overflow-y-auto" onCloseAutoFocus={function handleFocus(event) { event.preventDefault(); onReturnFocus(); }}><DialogTitle className="break-words pr-7">{t("Команда · ")}{project.name}</DialogTitle><DialogDescription>{t("Руководитель и уникальные исполнители всех задач проекта.")}</DialogDescription>{!data ? <div role="status" aria-label={t("Загрузка команды")} className="space-y-3">{[1, 2, 3].map((key) => <Skeleton key={key} className="h-14" />)}</div> : !data.ok ? <p role="alert" className="text-sm text-destructive">{t(data.error.message)}</p> : <><p className="text-xs text-muted-foreground">{t("Участников: ")}{data.data.total}</p>{!data.data.total && <p className="py-6 text-sm text-muted-foreground">{t("Руководитель и исполнители пока не назначены.")}</p>}<ul className="divide-y">{data.data.data.map((person) => <li key={person.id} className="motion-fade flex items-center gap-3 py-3"><TaskAssigneeAvatar assignee={person} /><div className="min-w-0"><p className="break-words text-sm font-medium">{person.name}</p><p className="mt-1 text-xs text-muted-foreground">{person.isManager ? t("Руководитель проекта") : t("Исполнитель задач")}{!person.active ? t(" · Неактивен") : ""}</p></div></li>)}</ul>{data.data.totalPages > 1 && <footer className="flex items-center justify-between gap-3 border-t pt-4 text-xs"><Button variant="outline" disabled={data.data.page <= 1} onClick={function handlePrevious() { setPage(data.data.page - 1); }}>{t("Назад")}</Button><span>{data.data.page} / {data.data.totalPages}</span><Button variant="outline" disabled={data.data.page >= data.data.totalPages} onClick={function handleNext() { setPage(data.data.page + 1); }}>{t("Далее")}</Button></footer>}</>}</DialogContent></Dialog>;
}
