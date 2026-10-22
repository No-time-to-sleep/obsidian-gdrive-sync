# Контекст текущего подэтапа

## Активная версия

- Версия: `v0.02.01`
- Статус: `completed` (2026-10-19)
- Дата фиксации: `2026-10-19`

## Цель подэтапа

Реализовать device flow и жизненный цикл токенов: получение кода, polling, сохранение, авто-обновление access token, revoke.

## Что уже сделано

- `src/auth/errors.ts` — типизированные ошибки (`AuthError` с кодами);
- `src/auth/types.ts` — типы токенов, credentials, `isStoredAuth` type guard, константа scope `drive.file`;
- `src/auth/device-flow.ts` — чистые функции: form body, разбор device code и token ответов, классификация ошибок polling и refresh, интервалы, проверка срока токена, abortable sleep;
- `src/auth/http.ts` — транспортный интерфейс `HttpClient` (для моков в тестах);
- `src/auth/obsidian-http-client.ts` — реализация через `requestUrl` (`throw: false`, без CORS-проблем);
- `src/auth/auth-manager.ts` — `connect()` с polling и обработкой `slow_down`/`pending`/`denied`/`expired`, `getAccessToken()` с refresh при `invalid_grant`, `disconnect()` с revoke;
- `src/auth/device-code-modal.ts` — модальное окно с кодом, кнопками «Open Google page» / «Copy code» / «Cancel» (закрытие отменяет polling);
- `src/settings.ts` — вкладка настроек: пошаговая инструкция по Google Cloud, client ID, client secret (password-поле), Connect/Reconnect, Disconnect, статус, ссылка на инструкцию;
- `src/main.ts` — команды `Connect Google Drive`, `Disconnect Google Drive`, `Show auth status`; хранение `{ settings, auth }` в `data.json`;
- `styles.css` — стили кода и статусов;
- тесты: `tests/device-flow.test.ts` (15) и `tests/auth-manager.test.ts` (10) на фейковом HTTP и часах; всего 30 тестов;
- `npm run build` проходит, `main.js` собран (22–24 КБ);
- версия плагина `0.2.1` (= `v0.02.01`), `versions.json` обновлён;
- сборка установлена в три vault'а (`первое`, «Большие-вызовы-подготовка», `StudyVault`);
- 2026-10-23: живое подключение на Windows пройдено — device flow завершён, токены сохранены (`scope=drive.file`), запрос к Drive API вернул 200.

## Что не входит в подэтап

- loopback + PKCE для desktop (v0.02.03) — отложено по решению пользователя 2026-10-19 (остаёмся на device flow);
- Drive API и синхронизация (этапы 03–04);
- мастер настройки Google Cloud внутри UI (этап 06).

## Что не удалось проверить

- Отзыв токена через Disconnect в живом Google (unit-тест есть, вручную не проверено).
- Поведение `window.open` и `navigator.clipboard` в Obsidian mobile (iOS).
- Авто-обновление access token после истечения в реальном времени (проверено только unit-тестами).

## Следующий логичный шаг

- `v0.02.02`: проверить статус после перезапуска Obsidian и Disconnect (revoke); затем повторить подключение на iOS. После этого — этап 03 (Drive adapter).
