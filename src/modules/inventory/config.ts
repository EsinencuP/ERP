import type { DomainDefinition } from "@/types/shared";

export const definition = {
  "title": "Склад",
  "singular": "товар",
  "description": "Всё на своих местах. Остатки — под контролем.",
  "primaryLabel": "Наименование",
  "secondaryLabel": "Артикул",
  "amountLabel": "Цена за единицу",
  "statuses": [
    "В наличии",
    "Мало на складе",
    "Нет в наличии"
  ],
  "board": false,
  "fields": [
    {
      "key": "title",
      "label": "Наименование",
      "type": "text",
      "required": true
    },
    {
      "key": "subtitle",
      "label": "Артикул",
      "type": "text",
      "required": true
    },
    {
      "key": "amount",
      "label": "Цена за единицу, ₽",
      "type": "money",
      "required": true
    },
    {
      "key": "quantity",
      "label": "Остаток, шт.",
      "type": "number",
      "required": true
    },
    {
      "key": "status",
      "label": "Состояние запаса",
      "type": "select"
    },
    {
      "key": "notes",
      "label": "Описание / место хранения",
      "type": "textarea"
    }
  ]
} as const satisfies DomainDefinition;
