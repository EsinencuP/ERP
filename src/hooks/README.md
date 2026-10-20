# Shared hooks

Перед добавлением hook проверять существующие общие компоненты и типы. `use-mobile.tsx` содержит общий media-query hook для Shadcn Sidebar и освобождает listener при unmount. Контекст темы находится в `next-themes`; отдельный дублирующий hook не создаётся.

`use-debounced-value.ts`: общий `useDebouncedValue(value, delay=300)`, отменяет предыдущий таймер и освобождает его при unmount. Используется поиском контактов и участников; не выполняет запросы сам.

`use-kanban-dnd.ts`: общие createKanbanDnd/useKanbanSensors, извлечённые из CRM TASK-008 и используемые CRM/Projects TASK-021. Pointer activation 7px, Keyboard arrows, column-only collision и отмена вне board; empty columns поддержаны.
