# GDrive BYO Sync

Репозиторий: https://github.com/No-time-to-sleep/obsidian-gdrive-sync

Obsidian-плагин для двусторонней синхронизации vault с Google Drive. Пользователь подключает **свой** Google Cloud OAuth-клиент (BYO — bring your own credentials), никаких серверов и подписок.

- Рабочее название: `GDrive BYO Sync`
- Временный id плагина: `gdrive-byo-sync` (финальное имя и id не зафиксированы, см. `docs/PUBLISHING.md`)
- Целевые платформы: Windows, macOS 13+, iOS
- Текущий статус: **этап 01, исследование и архитектура**. Работающий код синхронизации ещё не написан.

## Что уже есть

- `docs/COMPARISON.md` — сравнение с существующими решениями (Obsidian Sync, Remotely Save, Google Drive Sync и др.).
- `docs/ARCHITECTURE.md` — архитектура плагина: auth, Drive adapter, sync engine, UI.
- `docs/SYNC_ALGORITHM.md` — детальный алгоритм синхронизации и таблица решений.
- `docs/GOOGLE_CLOUD_SETUP.md` — инструкция для пользователя по созданию OAuth-клиента.
- `docs/PUBLISHING.md` — требования к публикации в community plugins и Google OAuth.
- `docs/RESEARCH_NOTES.md` — источники и факты, на которых построены решения.
- Каркас сборки: `package.json`, `esbuild.config.mjs`, `tsconfig.json`, `manifest.json`, `src/main.ts`.

## Быстрый старт для разработки

```powershell
npm install
npm run build        # tsc --noEmit + esbuild -> main.js
npm test             # vitest (пока тестов нет, только заготовка)
```

Установка в vault для ручной проверки:

1. Собрать `main.js`.
2. Скопировать `manifest.json` и `main.js` в `<vault>\.obsidian\plugins\gdrive-byo-sync\`.
3. Включить плагин в настройках Obsidian.

На текущем этапе плагин при загрузке показывает Notice с текстом «scaffold loaded» — это заглушка, синхронизация не реализована.

## Принципы проекта

- Только scope `https://www.googleapis.com/auth/drive.file` (non-sensitive, без обязательной верификации Google).
- Работаем только через Obsidian API и `requestUrl`, без Node-специфичных API, чтобы код работал на мобильных.
- Никогда не удаляем данные безвозвратно: Drive — в trash, локально — в `.trash` Obsidian.
- Конфликты не перетираем: оба варианта сохраняются.
- Никакой телеметрии, никаких промежуточных серверов, токены хранятся только локально.

## Структура

- `docs/` — документация.
- `src/` — код плагина.
- `tests/` — тесты.
- `prompts/` — исходники промптов проекта.

Локальные правила проекта: `AGENTS.md`. Рабочий контекст: `SESSION_CONTEXT.md`, `STAGE_CONTEXT.md`, `SUBSTAGE_CONTEXT.md`, `PLAN.md`.
