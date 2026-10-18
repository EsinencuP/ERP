# Shared hooks

Перед добавлением hook проверять существующие общие компоненты и типы. `use-mobile.tsx` содержит общий media-query hook для Shadcn Sidebar и освобождает listener при unmount. Контекст темы находится в `next-themes`; отдельный дублирующий hook не создаётся.

`use-debounced-value.ts`: общий `useDebouncedValue(value, delay=300)`, отменяет предыдущий таймер и освобождает его при unmount. Используется поиском контактов и участников; не выполняет запросы сам.
