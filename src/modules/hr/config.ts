import type { DomainDefinition } from "@/types/shared";

export const definition = {
  "title": "Команда",
  "singular": "сотрудника",
  "description": "Люди, с которыми вы создаёте больше.",
  "primaryLabel": "Сотрудник",
  "secondaryLabel": "Должность / отдел",
  "amountLabel": "Зарплата",
  "statuses": [
    "Работает",
    "В отпуске",
    "Неактивен"
  ],
  "board": false,
  "fields": [
    {
      "key": "title",
      "label": "Имя и фамилия",
      "type": "text",
      "required": true
    },
    {
      "key": "subtitle",
      "label": "Должность / отдел",
      "type": "text",
      "required": true
    },
    {
      "key": "email",
      "label": "Рабочий email",
      "type": "email",
      "required": true
    },
    {
      "key": "status",
      "label": "Статус",
      "type": "select"
    },
    {
      "key": "date",
      "label": "Дата приёма",
      "type": "date"
    },
    {
      "key": "amount",
      "label": "Зарплата, €",
      "type": "money"
    },
    {
      "key": "notes",
      "label": "Заметки",
      "type": "textarea"
    }
  ]
} as const satisfies DomainDefinition;
