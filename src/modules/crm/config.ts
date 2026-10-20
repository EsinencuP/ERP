import type { DomainDefinition } from "@/types/shared";

export const definition = {
  "title": "CRM",
  "singular": "сделку",
  "description": "От первого знакомства до нового контракта.",
  "primaryLabel": "Сделка / компания",
  "secondaryLabel": "Контактное лицо",
  "amountLabel": "Бюджет",
  "statuses": [
    "Новая",
    "Переговоры",
    "Предложение",
    "Выиграна",
    "Проиграна"
  ],
  "board": true,
  "fields": [
    {
      "key": "title",
      "label": "Название сделки",
      "type": "text",
      "required": true
    },
    {
      "key": "subtitle",
      "label": "Компания / контакт",
      "type": "text",
      "required": true
    },
    {
      "key": "email",
      "label": "Email",
      "type": "email"
    },
    {
      "key": "amount",
      "label": "Бюджет, €",
      "type": "money",
      "required": true
    },
    {
      "key": "status",
      "label": "Этап",
      "type": "select"
    },
    {
      "key": "date",
      "label": "Плановая дата закрытия",
      "type": "date"
    },
    {
      "key": "notes",
      "label": "Комментарий",
      "type": "textarea"
    }
  ]
} as const satisfies DomainDefinition;
