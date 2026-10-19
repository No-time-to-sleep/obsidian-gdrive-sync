# Контекст текущего этапа

## Текущий этап

- Код этапа: `02`
- Название: `auth`
- Статус: `in_progress` (начат 2026-10-19)

## Цель этапа

Реализовать авторизацию Google без инфраструктуры автора: device flow с использованием OAuth-креденшелов пользователя, безопасное хранение и обновление токенов, UI подключения.

## Что входит в этап

- device flow: запрос кода, polling, обработка `authorization_pending` / `slow_down` / `access_denied` / `expired_token`;
- хранение refresh/access токенов в `data.json`, авто-обновление access token до истечения;
- revoke при отключении (`/revoke`);
- UI: вкладка настроек (client ID/secret, Connect/Disconnect, статус), модальное окно с кодом;
- проверка на Windows и iOS;
- опционально: loopback + PKCE для desktop (v0.02.03).

## Критерии завершения этапа

- `npm run build` и `npm test` проходят без ошибок — ✅ 2026-10-19 (30 тестов);
- подключение к реальному Google Cloud проекту выполняется на Windows — ⏳ ожидает проверки;
- disconnect отзывает refresh token — ⏳ ожидает проверки;
- проверено поведение на iOS — ⏳ не выполнено.

## Что осталось проверить вручную

- Подключить плагин в Obsidian (`D:\odsidian1\первое`) к реальному Google Cloud проекту и пройти device flow. ← первая проверка: client ID пользователя отклонён (`Invalid client type`), создаётся корректный OAuth-клиент
- Повторить подключение на iPhone (Obsidian mobile). ← не выполнено
- Проверить, что после перезапуска Obsidian статус остаётся «connected» и access token обновляется сам. ← не выполнено
