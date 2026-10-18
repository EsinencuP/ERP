import { failure, success } from "@/lib/errors";
import type { Result } from "@/types/shared";

/** Download a UTF-8 CSV and neutralize spreadsheet formula prefixes. */
export function downloadCsv(filename: string, rows: readonly (readonly (string | number)[])[]): Result<true> {
  try {
    const escaped = rows.map((row) => row.map((cell) => { const text = String(cell); const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text; return `"${safe.replaceAll('"', '""')}"`; }).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", escaped], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
    return success(true);
  } catch { return failure("STORAGE", "Не удалось скачать CSV. Проверьте настройки браузера"); }
}
