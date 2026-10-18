# Shared hooks

Перед добавлением hook проверять существующие общие компоненты и типы. `use-mobile.tsx` содержит общий media-query hook для Shadcn Sidebar и освобождает listener при unmount. Контекст темы находится в `next-themes`; отдельный дублирующий hook не создаётся.
