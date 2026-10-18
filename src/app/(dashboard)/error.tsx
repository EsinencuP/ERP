"use client";
import { Button } from "@/components/ui/button";

/** Recover from unexpected rendering errors at the framework boundary. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="panel p-8" role="alert"><h2 className="text-lg font-medium">Не удалось открыть страницу</h2><p className="muted my-3 text-sm">Попробуйте загрузить её снова.</p><Button onClick={function handleRetry() { reset(); }}>Повторить</Button></div>; }
