# GDrive BYO Sync

Репозиторий: https://github.com/No-time-to-sleep/obsidian-gdrive-sync

Obsidian-плагин для двусторонней синхронизации vault с Google Drive. Пользователь подключает **свой** Google Cloud OAuth-клиент (BYO — bring your own credentials), никаких серверов и подписок.

- Рабочее название: `GDrive BYO Sync`
- Временный id плагина: `gdrive-byo-sync` (финальное имя и id не зафиксированы, см. `docs/PUBLISHING.md`)
- Целевые платформы: Windows, macOS 13+, iOS
- Текущий статус: **этап 02, авторизация Google**. Device flow, хранение и автоматическое обновление токенов реализованы и покрыты unit-тестами; синхронизация ещё не написана. Живая проверка с реальным Google Cloud проектом — ожидается.

## Что уже есть

- `docs/COMPARISON.md` — сравнение с существующими решениями (Obsidian Sync, Remotely Save, Google Drive Sync и др.).
- `docs/ARCHITECTURE.md` — архитектура плагина: auth, Drive adapter, sync engine, UI.
- `docs/SYNC_ALGORITHM.md` — детальный алгоритм синхронизации и таблица решений.
- `docs/GOOGLE_CLOUD_SETUP.md` — инструкция для пользователя по созданию OAuth-клиента.
- `docs/PUBLISHING.md` — требования к публикации в community plugins и Google OAuth.
- `docs/RESEARCH_NOTES.md` — источники и факты, на которых построены решения.
- `src/auth/` — device flow («TVs and Limited Input devices»), менеджер токенов (хранение, авто-обновление, revoke), UI подключения.
- Каркас сборки: `package.json`, `esbuild.config.mjs`, `tsconfig.json`, `manifest.json`, `src/main.ts`.

## Быстрый старт для разработки

```powershell
npm install
npm run build        # tsc --noEmit + esbuild -> main.js
npm test             # vitest: метаданные релиза, device flow, менеджер токенов
```

Установка в vault для ручной проверки:

1. Собрать `main.js`.
2. Скопировать `manifest.json`, `main.js` и `styles.css` в `<vault>\.obsidian\plugins\gdrive-byo-sync\`.
3. Включить плагин в настройках Obsidian.

## Подключение Google Drive

1. Создать OAuth-клиент типа «TVs and Limited Input devices» по инструкции `docs/GOOGLE_CLOUD_SETUP.md`.
2. В настройках плагина вставить OAuth client ID и client secret.
3. Выполнить команду **Connect Google Drive**, открыть страницу Google, ввести показанный код.
4. Проверить статус командой **Show auth status**; отключение — **Disconnect Google Drive** (refresh token отзывается).

Пока реализованы только подключение и токены: Drive API и синхронизация — этапы 03–04.

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
