import { differenceInBusinessDays, isWeekend, parseISO } from "date-fns";
import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";

/** Count inclusive calendar weekdays with date-fns; dates are parsed as calendar dates, never shifted from UTC. */
export function getLeaveDays(startDate: string, endDate: string): Result<number> {
  for (const value of [startDate, endDate]) if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000") || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) return err("VALIDATION", "Укажите существующие даты начала и окончания");
  if (startDate > endDate) return err("VALIDATION", "Окончание отпуска не раньше начала");
  const end = parseISO(endDate), days = differenceInBusinessDays(end, parseISO(startDate)) + (isWeekend(end) ? 0 : 1);
  return Number.isInteger(days) && days > 0 && days <= 9999 ? ok(days) : err("VALIDATION", "Период должен содержать от 1 до 9999 рабочих дней (пн–пт)");
}
