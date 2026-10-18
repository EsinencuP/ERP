"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { createSession } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/feedback";

const schema = z.object({ email: z.string().email("Введите корректный email"), password: z.string().min(1, "Введите пароль") });
type LoginData = z.infer<typeof schema>;

/** Sign in with administrator-provisioned credentials or open the explicit demo workspace. */
export function LoginForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const form = useForm<LoginData>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  async function handleSubmit(data: LoginData) {
    setError("");
    try { const result = await createSession(data); if (!result.ok) { setError(result.error.message); return; } router.push("/"); router.refresh(); }
    catch { setError("Сервер недоступен. Попробуйте ещё раз"); }
  }
  return <div className="motion w-full max-w-[360px]"><div className="mb-6 flex size-11 items-center justify-center rounded-xl border bg-[hsl(var(--color-surface))]"><LockKeyhole className="size-5 text-[hsl(var(--color-primary))]" /></div><p className="eyebrow mb-3">РАБОЧЕЕ ПРОСТРАНСТВО</p><h1 className="text-3xl font-medium tracking-[-.045em]">С возвращением<span className="text-[hsl(var(--color-primary))]">.</span></h1><p className="muted mb-8 mt-3 text-xs leading-relaxed">{demo ? "Откройте демопространство и познакомьтесь с возможностями Evo ERP." : "Войдите, чтобы продолжить работу с вашей командой."}</p>{demo ? <><div className="mb-5 rounded-xl border bg-[hsl(var(--color-surface))] p-4"><p className="text-xs font-medium">Evo Studio · демопространство</p><p className="muted mt-2 text-[11px] leading-relaxed">Учебные данные, все пять модулей и сохранение изменений на этом компьютере.</p></div><Button asChild className="w-full"><Link href="/">Открыть демо<ArrowRight /></Link></Button><p className="muted mt-4 text-center text-[10px]">Деморежим включён владельцем установки.</p></> : <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-5"><div><label htmlFor="login-email" className="field-label">Рабочий email</label><Input id="login-email" type="email" autoComplete="username" placeholder="you@company.ru" {...form.register("email")} aria-invalid={Boolean(form.formState.errors.email)} aria-describedby="login-email-error" /><p id="login-email-error" className="mt-1.5 text-[10px] text-[hsl(var(--color-danger))]">{form.formState.errors.email?.message}</p></div><div><label htmlFor="login-password" className="field-label">Пароль</label><div className="relative"><Input id="login-password" type={visible ? "text" : "password"} autoComplete="current-password" className="pr-10" {...form.register("password")} aria-invalid={Boolean(form.formState.errors.password)} aria-describedby="login-password-error" /><button type="button" className="absolute right-3 top-3 muted" aria-label={visible ? "Скрыть пароль" : "Показать пароль"} onClick={function handlePasswordVisibility() { setVisible((value) => !value); }}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div><p id="login-password-error" className="mt-1.5 text-[10px] text-[hsl(var(--color-danger))]">{form.formState.errors.password?.message}</p></div>{error && <p role="alert" className="rounded-lg bg-[hsl(var(--color-danger-soft))] p-3 text-xs text-[hsl(var(--color-danger))]">{error}</p>}<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>Войти в пространство{form.formState.isSubmitting ? <Spinner /> : <ArrowRight />}</Button><p className="muted text-center text-[10px]">Доступ и восстановление пароля — через администратора.</p></form>}</div>;
}
