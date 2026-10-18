import { defaultRecord } from "@/lib/record-schema";
import type { DocumentRecord, Domain, RecordData, WorkspaceState } from "@/types/shared";

/** Generate clearly labelled sample data relative to the current month. */
export function createDemoState(): WorkspaceState {
  const now = new Date();
  const stamp = now.toISOString();
  const day = (offset: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)).toISOString().slice(0, 10);
  const documents: DocumentRecord[] = [];
  const add = (domain: Domain, data: Partial<RecordData> & Pick<RecordData, "title" | "subtitle" | "status">, daysAgo = 0) => {
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const record: DocumentRecord = { id: `demo-${domain}-${documents.length + 1}`, workspaceId: "demo-workspace", domain, version: 1, createdAt, updatedAt: createdAt, data: { ...defaultRecord, ...data } };
    documents.push(record);
    return record;
  };
  add("crm", { title: "Редизайн интернет-магазина", subtitle: "Forma · Елена Смирнова", status: "Переговоры", amount: 48000000, email: "elena@forma.example", date: day(8), notes: "Подготовить варианты структуры каталога" }, 4);
  add("crm", { title: "Корпоративный портал", subtitle: "Nord Group · Марк Орлов", status: "Предложение", amount: 125000000, date: day(12) }, 10);
  add("crm", { title: "Брендинг и стратегия", subtitle: "Культура · Анна Белова", status: "Новая", amount: 32000000, date: day(5) }, 1);
  add("crm", { title: "Мобильное приложение", subtitle: "Point · Илья Морозов", status: "Переговоры", amount: 86000000, date: day(20) }, 7);
  add("crm", { title: "Дизайн-система", subtitle: "Линия · Ольга Иванова", status: "Выиграна", amount: 64000000, date: day(-3) }, 14);
  add("crm", { title: "Лендинг нового продукта", subtitle: "Mono · Денис Ким", status: "Предложение", amount: 18000000, date: day(4) }, 3);
  add("crm", { title: "Аудит продукта", subtitle: "Atlas · Павел Соколов", status: "Новая", amount: 9500000, date: day(10) }, 2);
  add("crm", { title: "Сайт мероприятия", subtitle: "Событие · Ирина Сергеева", status: "Проиграна", amount: 15000000, date: day(-8) }, 21);
  const paid = add("finance", { title: "INV-2026-041", subtitle: "Линия", status: "Оплачен", amount: 64000000, date: day(-2), notes: "Разработка дизайн-системы" }, 18);
  add("finance", { title: "INV-2026-042", subtitle: "Forma", status: "Отправлен", amount: 24000000, date: day(-1), notes: "Первый этап редизайна" }, 8);
  const partial = add("finance", { title: "INV-2026-043", subtitle: "Nord Group", status: "Частично оплачен", amount: 45000000, date: day(5), notes: "Корпоративный портал, этап 1" }, 7);
  add("finance", { title: "INV-2026-044", subtitle: "Mono", status: "Отправлен", amount: 18000000, date: day(3) }, 3);
  add("finance", { title: "INV-2026-045", subtitle: "Культура", status: "Черновик", amount: 32000000, date: day(9) }, 1);
  const paid2 = add("finance", { title: "INV-2026-040", subtitle: "Atlas", status: "Оплачен", amount: 9500000, date: day(-10) }, 28);
  add("inventory", { title: "MacBook Pro 14″", subtitle: "EQ-MBP-014", status: "В наличии", amount: 21990000, quantity: 8, notes: "Основной офис · техника" });
  add("inventory", { title: "Монитор Dell UltraSharp", subtitle: "EQ-DLU-027", status: "Мало на складе", amount: 5490000, quantity: 2 });
  add("inventory", { title: "Клавиатура Logitech MX", subtitle: "EQ-LMX-001", status: "В наличии", amount: 1290000, quantity: 12 });
  add("inventory", { title: "Кресло офисное Ergo", subtitle: "FR-ERG-002", status: "Нет в наличии", amount: 3290000, quantity: 0 });
  add("inventory", { title: "Блокнот Evo Studio", subtitle: "ST-EVO-001", status: "В наличии", amount: 89000, quantity: 46 });
  for (const [title, subtitle, email, status] of [
    ["Александр Волков", "Руководитель студии", "alex@demo.example", "Работает"],
    ["Елена Смирнова", "Арт-директор · Дизайн", "elena@demo.example", "Работает"],
    ["Марк Орлов", "Разработчик · Engineering", "mark@demo.example", "Работает"],
    ["Анна Белова", "Дизайнер · Дизайн", "anna@demo.example", "В отпуске"],
    ["Илья Морозов", "Менеджер проектов", "ilya@demo.example", "Работает"],
    ["Ольга Иванова", "Финансовый менеджер", "olga@demo.example", "Работает"],
  ] as const) add("hr", { title, subtitle, email, status, date: "2025-03-10", amount: 18000000 });
  add("projects", { title: "Дизайн-система Линия", subtitle: "Елена Смирнова", status: "Завершён", amount: 64000000, progress: 100, date: day(-3) }, 35);
  add("projects", { title: "Новый сайт Forma", subtitle: "Марк Орлов", status: "В работе", amount: 48000000, progress: 64, date: day(8), notes: "Каталог, карточка товара, оформление заказа" }, 15);
  add("projects", { title: "Портал Nord Group", subtitle: "Илья Морозов", status: "В работе", amount: 125000000, progress: 32, date: day(21) }, 12);
  add("projects", { title: "Лендинг Mono", subtitle: "Елена Смирнова", status: "На проверке", amount: 18000000, progress: 90, date: day(3) }, 7);
  add("projects", { title: "Бренд Культура", subtitle: "Анна Белова", status: "Планирование", amount: 32000000, progress: 10, date: day(30) }, 2);
  const payments = [
    { id: "demo-payment-1", documentId: paid.id, workspaceId: "demo-workspace", amount: paid.data.amount, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), reference: "demo-receipt-1" },
    { id: "demo-payment-2", documentId: partial.id, workspaceId: "demo-workspace", amount: 15000000, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), reference: "demo-receipt-2" },
    { id: "demo-payment-3", documentId: paid2.id, workspaceId: "demo-workspace", amount: paid2.data.amount, createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), reference: "demo-receipt-3" },
  ];
  return { documents, payments, events: [
    { id: "demo-event-1", workspaceId: "demo-workspace", actor: "Ольга Иванова", domain: "finance", action: "payment", title: "Оплата по счёту INV-2026-041", createdAt: stamp },
    { id: "demo-event-2", workspaceId: "demo-workspace", actor: "Елена Смирнова", domain: "projects", action: "updated", title: "Лендинг Mono", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "demo-event-3", workspaceId: "demo-workspace", actor: "Александр Волков", domain: "crm", action: "created", title: "Брендинг и стратегия", createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: "demo-event-4", workspaceId: "demo-workspace", actor: "Илья Морозов", domain: "projects", action: "updated", title: "Портал Nord Group", createdAt: new Date(Date.now() - 14400000).toISOString() },
  ] };
}
