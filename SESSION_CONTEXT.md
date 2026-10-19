# Постоянный контекст проекта

Постоянные правила, факты и решения проекта. Меняется редко, только при изменении принципиальных договорённостей.

## Идентичность проекта

- Имя проекта (рабочее): `GDrive BYO Sync`.
- Папка: `D:\opencode\obsidian-gdrive-sync`.
- Временный id плагина: `gdrive-byo-sync`.
- Цель: двусторонняя синхронизация vault Obsidian с Google Drive на Windows, macOS 13+ и iOS с использованием собственных OAuth-креденшелов пользователя.
- Перспектива: публикация в community plugins Obsidian.

## Постоянные решения

- **Scope:** только `drive.file` (non-sensitive). Это исключает обязательную верификацию Google и ограничивает доступ файлами, созданными плагином.
- **Auth:** основной сценарий — OAuth 2.0 Device Authorization Grant (client type «TVs and Limited Input devices»), потому что он работает одинаково на desktop и iOS и не требует сервера-посредника. Loopback + PKCE — опциональное улучшение для desktop (отдельный client type «Desktop app»).
- **Auth-режим (решение 2026-10-19):** остаёмся на device flow; Desktop app / loopback не внедряем. Loopback требует локального HTTP-сервера (Node API) и не работает на iOS, а device flow покрывает Windows, macOS и iPhone.
- **Хранение секретов:** refresh token, access token и client secret — локально в `data.json` плагина. Плагин не отправляет их никуда, кроме Google OAuth и Drive API.
- **Синхронизация:** state-based three-way diff (base из состояния последней синхронизации), без журнала операций. Отсутствие файла на одной стороне считается удалением только после полного успешного скана.
- **Удаления:** Drive — `trashed=true` (восстановимо 30 дней), локально — `.trash` Obsidian. Безвозвратных удалений нет.
- **Конфликты:** сохраняются оба варианта, локальная версия остаётся канонической, удалённая сохраняется как conflict copy. Автоматический merge текста — не в MVP.
- **Начальный слияние (нет state):** безопасный merge без удалений: локальные-only загружаются, удалённые-only скачиваются, разные версии одного пути дают conflict copy.
- **Игнор по умолчанию:** `.obsidian/workspace*.json`, `.trash`, `node_modules`, `.git`, data.json плагина, файлы больше лимита (настраивается).
- **Сканирование remote:** полный листинг метаданных через `files.list` (страницами по 1000), без опоры на Changes API. Changes API — открытый вопрос совместимости с `drive.file`.

## Платформенные факты

- Мобильный Obsidian не имеет Node API: локальный HTTP-сервер (loopback) на iOS невозможен, поэтому device flow — основной путь.
- Google не поддерживает custom URI scheme редиректы (с 2026) и не рекомендует loopback на iOS/Android; использовать их на мобильных нельзя.
- В статусе OAuth consent screen «Testing» refresh token истекает через 7 дней. В инструкции пользователю нужно явно указать перевод проекта в статус «In production» (для non-sensitive scope верификация Google не обязательна).
- Device flow поддерживает только ограниченный набор scope, и `drive.file` в него входит.

## Правила честности

- Не заявлять о поддержке платформы, пока не выполнена реальная проверка на этой платформе.
- В документации явно разделять «проверено», «ожидает проверки» и «предположение».
- Google OAuth и Drive API могут менять политики; спорные факты фиксируются в `docs/RESEARCH_NOTES.md` со ссылками и датой проверки.

## Связанные документы

- `docs/ARCHITECTURE.md` — архитектура и обоснования решений.
- `docs/SYNC_ALGORITHM.md` — алгоритм синхронизации.
- `docs/COMPARISON.md` — сравнение с другими решениями.
- `docs/GOOGLE_CLOUD_SETUP.md` — настройка Google Cloud для пользователя.
- `docs/PUBLISHING.md` — путь в community plugins.
