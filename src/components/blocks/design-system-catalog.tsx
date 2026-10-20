"use client";
import { useI18n } from "@/i18n/use-i18n";


import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { CalendarDays, ChevronDown, Layers3, Palette, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { toast } from "@/components/ui/toast";

const formSchema = z.object({ name: z.string().trim().min(2, "Введите минимум 2 символа") });
const swatches = ["primary", "success", "warning", "danger", "info"] as const;

function SidebarPreview() {
  const { t } = useI18n();

  const sidebar = useSidebar();
  if (!sidebar.ok) return <p role="alert">{t(sidebar.error.message)}</p>;
  return <Sidebar collapsible="none" className="!w-full rounded-xl border"><SidebarHeader className="flex-row items-center gap-2 p-4"><Layers3 className="size-4 text-primary" /><span className="text-sm font-medium">{t("Панель навигации")}</span></SidebarHeader><SidebarContent className="p-2"><SidebarMenu><SidebarMenuItem><SidebarMenuButton isActive onClick={function handleSidebarDemo() { toast(t("Выбрана дизайн-система")); }}><Palette /><span>{t("Дизайн-система")}</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarContent></Sidebar>;
}

/** Interactive reference for TASK-001 primitives; sample controls never modify business data. */
export function DesignSystemCatalog() {
  const { t , locale: uiLocale } = useI18n();

  const { theme, setTheme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [stage, setStage] = useState("new");
  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { name: "" } });
  function handleSubmit(data: z.infer<typeof formSchema>) { toast.success(t("Форма проверена"), { description: data.name }); }
  function handleCommand() { setCommandOpen(false); toast(t("Команда выполнена")); }

  return <div className="space-y-6"><div className="motion flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-2">{t("TASK-001 / UI REFERENCE")}</p><h1 className="page-title">{t("Дизайн-система")}<span className="text-primary">.</span></h1><p className="muted mt-2 text-xs">{t("Slate · Indigo-Violet · Geist. Примеры не изменяют данные ERP.")}</p></div><Button variant="outline" onClick={function handleThemeToggle() { setTheme(theme === "dark" ? "light" : "dark"); }}>{t("Переключить тему")}</Button></div>
    <Card><CardHeader><CardTitle>{t("Семантическая палитра")}</CardTitle><CardDescription>{t("Одни токены для всех компонентов и обеих тем.")}</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">{swatches.map((token) => <div key={token} className="rounded-lg border p-3"><div className="mb-3 h-12 rounded-md" style={{ background: `hsl(var(--color-${token}))` }} /><p className="font-mono text-xs">{token}</p></div>)}</CardContent></Card>
    <div className="grid items-start gap-5 xl:grid-cols-2"><Card><CardHeader><CardTitle>{t("Действия и состояния")}</CardTitle><CardDescription>{t("Button, Badge, Avatar, DropdownMenu, Dialog, Sheet и Command.")}</CardDescription></CardHeader><CardContent className="space-y-5"><div className="flex flex-wrap gap-2">{(["default", "outline", "secondary", "ghost", "destructive", "link"] as const).map((variant) => <Button key={variant} variant={variant} onClick={function handleVariantClick() { toast(`Button: ${variant}`); }}>{variant}</Button>)}<Button disabled>{t("Недоступно")}</Button></div><Separator /><div className="flex flex-wrap items-center gap-3"><Avatar><AvatarFallback>{t("EV")}</AvatarFallback></Avatar><Badge>{t("Основной")}</Badge><Badge variant="secondary">{t("Вторичный")}</Badge><Badge variant="outline">{t("Контур")}</Badge><Badge status="Оплачен" /></div><div className="flex flex-wrap gap-2"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">{t("Действия")}<ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuItem onSelect={function handleMenuSelect() { toast(t("Пункт меню выбран")); }}>{t("Пример действия")}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button variant="outline">{t("Открыть диалог")}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle className="text-lg font-medium">{t("Пример диалога")}</DialogTitle><DialogDescription className="muted text-sm">{t("Фокус остаётся внутри окна. Escape закрывает диалог.")}</DialogDescription></DialogHeader><p className="muted my-6 text-sm">{t("Модальное окно использует общие цвета, радиусы и шрифты.")}</p><DialogFooter><Button onClick={function handleDialogClose() { setDialogOpen(false); }}>{t("Готово")}</Button></DialogFooter></DialogContent></Dialog>
      <Sheet><SheetTrigger asChild><Button variant="outline">{t("Боковая панель")}</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>{t("Пример панели")}</SheetTitle><SheetDescription>{t("Адаптивная панель Sheet на Radix Dialog.")}</SheetDescription></SheetHeader><p className="muted mt-6 text-sm">{t("Открывается с края экрана и поддерживает навигацию с клавиатуры.")}</p></SheetContent></Sheet>
      <Button variant="outline" onClick={function handleCommandOpen() { setCommandOpen(true); }}><Search />{t("Команды")}</Button><Button onClick={function handleToast() { toast.success(t("Уведомление Sonner"), { description: t("Цвета и шрифт соответствуют активной теме.") }); }}>{t("Показать уведомление")}</Button></div></CardContent></Card>
      <Card><CardHeader><CardTitle>{t("Ввод данных")}</CardTitle><CardDescription>{t("RHF + Zod, Label, Input, Textarea, Select и Popover Calendar.")}</CardDescription></CardHeader><CardContent className="space-y-5"><Form {...form}><form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3" noValidate><FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>{t("Название примера")}</FormLabel><FormControl><Input placeholder={t("Введите название")} {...field} /></FormControl><FormMessage /></FormItem>} /><Button type="submit">{t("Проверить форму")}</Button></form></Form><Separator /><div><Label htmlFor="catalog-stage">{t("Этап")}</Label><Select value={stage} onValueChange={setStage}><SelectTrigger id="catalog-stage" className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">{t("Новый")}</SelectItem><SelectItem value="active">{t("В работе")}</SelectItem><SelectItem value="done">{t("Завершён")}</SelectItem></SelectContent></Select></div><div><Label htmlFor="catalog-notes">{t("Заметка")}</Label><Textarea id="catalog-notes" placeholder={t("Пример многострочного поля")} className="mt-2" /></div><Popover open={calendarOpen} onOpenChange={setCalendarOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarDays />{date ? format(date, "PPP", { locale: uiLocale === "ru" ? ru : enUS }) : t("Выбрать дату")}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} locale={uiLocale === "ru" ? ru : enUS} onSelect={function handleDateSelect(value) { setDate(value); setCalendarOpen(false); }} /></PopoverContent></Popover></CardContent></Card>
    </div>
    <div className="grid gap-5 xl:grid-cols-2"><Card><CardHeader><CardTitle>{t("Таблица и загрузка")}</CardTitle><CardDescription>{t("Примеры статусов и Skeleton, без бизнес-данных.")}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("Компонент")}</TableHead><TableHead>{t("Состояние")}</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>{t("Table")}</TableCell><TableCell><Badge variant="secondary">{t("Готов")}</Badge></TableCell></TableRow><TableRow><TableCell>{t("Skeleton")}</TableCell><TableCell><Skeleton className="h-4 w-24" aria-label={t("Пример загрузки")} /></TableCell></TableRow></TableBody></Table></CardContent></Card><Card><CardHeader><CardTitle>{t("Sidebar")}</CardTitle><CardDescription>{t("Общий provider, меню и активное состояние.")}</CardDescription></CardHeader><CardContent><SidebarProvider className="!min-h-0"><SidebarPreview /></SidebarProvider></CardContent></Card></div>
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}><CommandInput placeholder={t("Найти пример...")} /><CommandList><CommandEmpty>{t("Ничего не найдено.")}</CommandEmpty><CommandGroup heading="Примеры"><CommandItem onSelect={handleCommand}>{t("Показать уведомление")}</CommandItem><CommandItem onSelect={function handleThemeCommand() { setTheme(theme === "dark" ? "light" : "dark"); setCommandOpen(false); }}>{t("Переключить тему")}</CommandItem></CommandGroup></CommandList></CommandDialog>
  </div>;
}
