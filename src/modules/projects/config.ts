import type { DomainDefinition } from "@/types/shared";

export const definition = {
  "title": "Проекты",
  "singular": "проект",
  "description": "От большой идеи к выполненной работе.",
  "primaryLabel": "Проект",
  "secondaryLabel": "Ответственный",
  "amountLabel": "Бюджет",
  "statuses": [
    "Планирование",
    "В работе",
    "На проверке",
    "Завершён"
  ],
  "board": true,
  "fields": [
    {
      "key": "title",
      "label": "Название проекта",
      "type": "text",
      "required": true
    },
    {
      "key": "subtitle",
      "label": "Ответственный",
      "type": "text",
      "required": true
    },
    {
      "key": "amount",
      "label": "Бюджет, €",
      "type": "money"
    },
    {
      "key": "status",
      "label": "Этап",
      "type": "select"
    },
    {
      "key": "progress",
      "label": "Готовность, %",
      "type": "number"
    },
    {
      "key": "date",
      "label": "Дедлайн",
      "type": "date",
      "required": true
    },
    {
      "key": "notes",
      "label": "Описание",
      "type": "textarea"
    }
  ]
} as const satisfies DomainDefinition;
