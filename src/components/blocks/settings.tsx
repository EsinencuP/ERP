"use client";
import { useI18n } from "@/i18n/use-i18n";


import { useEffect, useState } from "react";
import { SettingsNavigation } from "@/modules/settings/components/settings-navigation";
import { AppConfigurationForm } from "@/modules/settings/components/app-configuration-form";
import { LanguageSettings } from "./language-settings";
import { useTheme } from "next-themes";
import { toast } from "@/components/ui/toast";
import { Check, Database, Laptop, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { initials } from "@/lib/utils";
import { PERMISSIONS, ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@/types/shared";
import { usePermissions } from "@/hooks/usePermissions";
import type { SessionContext } from "@/types/shared";

/** Display tenant identity, documented permissions and persistent appearance preferences. */
export function Settings({ session }: { session: SessionContext }) {
  const { t } = useI18n();

  const { isAdmin } = usePermissions();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const activeTheme = mounted ? theme : undefined;
  const [message, setMessage] = useState("");
  function handleThemeChange(value: "dark" | "light") {
    setTheme(value);
    setMessage(t("Тема применена для этого браузера"));
    toast.success(t("Тема изменена"), { description: value === "dark" ? t("Тёмная тема Slate") : t("Светлая тема Slate") });
  }
  return <div className="max-w-5xl space-y-6"><div className="motion"><p className="eyebrow mb-2">{t("ВАШЕ ПРОСТРАНСТВО")}</p><h1 className="page-title">{t("Настройки")}<span className="text-[hsl(var(--color-primary))]">.</span></h1><p className="muted mt-2 text-xs">{t("Личные предпочтения и доступ к рабочему пространству.")}</p></div><SettingsNavigation section="general" admin={isAdmin} /><LanguageSettings /><AppConfigurationForm readOnly={!isAdmin || session.demo} demo={session.demo} /><section className="panel p-6"><h2 className="mb-5 flex items-center gap-2 text-sm font-medium"><UserRound className="size-4 text-[hsl(var(--color-primary))]" />{t("Профиль")}</h2><div className="flex flex-wrap items-center gap-4"><span className="avatar size-14 text-sm">{initials(session.name)}</span><div><p className="text-base font-medium">{session.name}</p><p className="muted mt-1 text-xs">{session.email}</p></div><span className="ml-auto rounded-md border px-3 py-1.5 font-mono text-[10px] text-[hsl(var(--color-primary))]">{session.role}</span></div><div className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-2"><div><p className="field-label">{t("Рабочее пространство")}</p><p className="text-sm">{session.workspaceName}</p></div><div><p className="field-label">{t("Идентификатор пространства")}</p><p className="break-all font-mono text-xs muted">{session.workspaceId}</p></div></div><p className="muted mt-5 text-[10px]">{isAdmin ? t("Управляйте участниками и просматривайте журнал аудита в разделах настроек.") : t("Учётные данные и роли задаются администратором установки.")}</p></section><section className="panel p-6"><h2 className="flex items-center gap-2 text-sm font-medium"><Laptop className="size-4 text-[hsl(var(--color-primary))]" />{t("Внешний вид")}</h2><p className="muted mb-5 mt-2 text-xs">{t("Выберите тему. Настройка действует только в этом браузере.")}</p><div className="grid max-w-md grid-cols-2 gap-4">{([{ value: "dark", label: t("Тёмная"), icon: Moon }, { value: "light", label: t("Светлая"), icon: Sun }] as const).map((item) => <button key={item.value} aria-pressed={activeTheme === item.value} onClick={() => handleThemeChange(item.value)} className={`motion rounded-xl border p-4 text-left transition-colors ${activeTheme === item.value ? "border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary-soft))]" : "bg-[hsl(var(--color-background))]"}`}><div className="mb-5 flex justify-between"><item.icon className="size-5 text-[hsl(var(--color-muted))]" />{activeTheme === item.value && <Check className="size-4 text-[hsl(var(--color-primary))]" />}</div><p className="text-xs font-medium">{t(item.label)}</p></button>)}</div><p role="status" className="mt-4 min-h-4 text-[10px] text-[hsl(var(--color-success))]">{t(message)}</p></section><section className="panel overflow-hidden"><h2 className="flex items-center gap-2 px-6 py-5 text-sm font-medium"><ShieldCheck className="size-4 text-[hsl(var(--color-primary))]" />{t("Права доступа")}</h2><div className="overflow-x-auto"><table className="w-full"><thead><tr>{[t("Роль"), t("Удаление*"), t("Экспорт"), t("Участники"), t("Весь workspace")].map((label) => <th key={label} className="table-heading">{t(label)}</th>)}</tr></thead><tbody>{(Object.keys(PERMISSIONS) as Role[]).map((role) => <tr key={role} className="border-t"><td className="table-cell font-mono !text-[11px]">{t(ROLE_LABELS[role])} <span className="block text-[9px] muted">{role}</span></td>{Object.values(PERMISSIONS[role]).map((allowed, index) => <td key={index} className="table-cell !text-[11px] muted">{allowed ? t("Да") : t("Нет")}</td>)}</tr>)}</tbody></table></div><p className="muted px-6 py-4 text-[10px]">{t("* MANAGER не удаляет HR-записи. Счета с поступлениями защищены при любой роли. READONLY не изменяет данные. Все права действуют внутри текущего workspace.")}</p></section><section className="panel flex items-start gap-4 p-6"><span className="rounded-xl border p-3"><Database className="size-5 text-[hsl(var(--color-primary))]" /></span><div><h2 className="text-sm font-medium">{session.demo ? t("Локальное демопространство") : t("Рабочее пространство PostgreSQL")}</h2><p className="muted mt-2 max-w-xl text-xs leading-relaxed">{session.demo ? t("Это учебные данные. Изменения сохраняются на компьютере, где запущено приложение. Доступ к демопространству общий для посетителей этой установки.") : t("Данные доступны только участникам текущего пространства. Права определяются вашей ролью и проверяются при каждом изменении.")}</p></div></section></div>;
}
