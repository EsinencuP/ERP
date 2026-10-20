# Main Dashboard — TASK-023

Server page `/`: Revenue | Open Deals | Low Stock Alert | HR Pending, два графика, Recent Invoices (до 5) и Activity Feed (до 8). Пять чтений Promise.all после live auth, noStore/force-dynamic/force-no-store. Прямые Prisma reads не используют fetch или промежуточный HTTP API.

Revenue и счета относятся к выбранной RUB/USD/EUR; cash receipts включая налог, шесть месяцев UTC включая текущий. Open Deals = NEW/QUALIFIED/PROPOSAL/NEGOTIATION, BarChart — counts всех шести стадий. Склад — shared getInventoryStockAlert для active products по всем складам; KPI low+zero, баннер только при low > 0. HR pending — существующий getLeavePendingCount с manager/admin permission. READONLY/AGENT получают «Доступно руководителям», остальные виджеты доступны.

Activity Feed читает AuditEvent summaries, исключает payload before/after, ограничен workspace и 8 строками. Порядок createdAt desc/id desc. Создание/изменение/удаление/платежи/решения отображаются текстом; удалённые записи ведут в модуль, неизвестные домены не создают ссылок. Никакого смешивания с legacy Document counts.

Refresh и смена валюты выполняют новый GET server page, скрывая предыдущие данные до ответа. Форма имеет обычный GET fallback; pageshow восстанавливает управление после возврата браузером. Отдельные Result failures видимы вместо ложных нулей; failure auth скрывает весь dashboard. Empty states, точные текстовые данные графиков и disabled controls предусмотрены. Старый полный финансовый обзор доступен в `/finance/dashboard`.
