import type { DomainDefinition } from "@/types/shared";

export const definition = {
  "title": "Финансы",
  "singular": "счёт",
  "description": "Счета, поступления и движение вашего бизнеса.",
  "primaryLabel": "Номер счёта",
  "secondaryLabel": "Клиент",
  "amountLabel": "Сумма счёта",
  "statuses": [
    "Черновик",
    "Отправлен",
    "Частично оплачен",
    "Оплачен"
  ],
  "board": false,
  "fields": [
    {
      "key": "title",
      "label": "Номер счёта",
      "type": "text",
      "required": true
    },
    {
      "key": "subtitle",
      "label": "Клиент",
      "type": "text",
      "required": true
    },
    {
      "key": "amount",
      "label": "Сумма, €",
      "type": "money",
      "required": true
    },
    {
      "key": "status",
      "label": "Статус",
      "type": "select"
    },
    {
      "key": "date",
      "label": "Оплатить до",
      "type": "date",
      "required": true
    },
    {
      "key": "notes",
      "label": "Назначение",
      "type": "textarea"
    }
  ]
} as const satisfies DomainDefinition;
