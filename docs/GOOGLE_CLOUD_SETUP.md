# Настройка Google Cloud для GDrive BYO Sync

Инструкция для пользователя плагина. Один OAuth-клиент на все устройства. Занимает ~10 минут.

## Что понадобится

- Google-аккаунт.
- Браузер.
- Client ID и client secret, которые вы создадите ниже, а затем вставите в настройки плагина.

## Шаг 1. Создать проект

1. Откройте https://console.cloud.google.com/.
2. Сверху выберите проект → **New project**.
3. Имя: например, `Obsidian GDrive Sync`. Создайте проект.

## Шаг 2. Включить Google Drive API

1. **APIs & Services → Library**.
2. Найдите **Google Drive API**.
3. Нажмите **Enable**.

## Шаг 3. Настроить OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. User type: **External**. Создайте.
3. Заполните:
   - App name: любое, будет показано на экране согласия.
   - User support email и Developer contact — ваши адреса.
4. **Scopes**: добавьте `https://www.googleapis.com/auth/drive.file`.
   - Если Google предлагает «Add or remove scopes» → вручную вставьте этот scope.
5. **Test users**: добавьте свой Google-аккаунт.
6. **Publishing status → Publish app** (перевести в **In production**).

> Почему это важно: пока приложение в статусе **Testing**, Google выдаёт refresh token с ограниченным сроком жизни (7 дней), и вам придётся переподключать Drive каждую неделю. Scope `drive.file` относится к non-sensitive, поэтому обязательная верификация Google не требуется — достаточно перевести приложение в In production. Бренд-верификация (имя и логотип на экране согласия) — опционально.

## Шаг 4. Создать OAuth-клиент

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **TVs and Limited Input devices**.
3. Имя: `Obsidian plugin`.
4. **Create**.
5. Скопируйте **Client ID** и **Client secret**.

> Почему именно «TVs and Limited Input devices»: только этот тип поддерживает device flow — вход по коду без redirect-URL. Он одинаково работает на Windows, macOS и iPhone, не требует сервера-посредника и разрешает scope `drive.file`. Обычный «Desktop app» для loopback можно будет добавить позже как опциональный режим.

## Шаг 5. Подключить плагин

1. Obsidian → Settings → GDrive BYO Sync.
2. Вставьте Client ID и Client secret.
3. Нажмите **Connect**.
4. Плагин покажет код вида `ABCD-EFGH` и ссылку `https://www.google.com/device`.
5. Откройте ссылку, введите код, подтвердите доступ.
6. Вернитесь в Obsidian — плагин сам завершит подключение (опрос Google).

## Безопасность

- Client secret у installed-приложений не является секретом в строгом смысле, но не публикуйте его.
- Refresh token хранится локально в `data.json` плагина и даёт доступ к файлам, созданным плагином.
- Не синхронизируйте папку плагина со своими настройками (`data.json`) через сторонние сервисы и не коммитьте её.
- Отозвать доступ можно в любой момент: https://myaccount.google.com/permissions или кнопкой **Disconnect** в плагине.
- Плагин обращается только к `accounts.google.com`, `oauth2.googleapis.com` и `www.googleapis.com`.

## Ограничения scope `drive.file`

- Плагин видит **только файлы и папки, которые создал сам**.
- Если вы вручную загрузите заметку в папку плагина через веб-интерфейс Drive, плагин её не увидит.
- Папка `Obsidian/<vault>` создаётся плагином при первом синке.
- Просматривать и скачивать файлы через drive.google.com можно как обычно.

## Troubleshooting

| Ошибка | Причина | Что делать |
| --- | --- | --- |
| `invalid_client` / «Invalid client type» | OAuth-клиент создан другого типа (Desktop app, Web application и т.п.). Тип клиента нельзя изменить после создания | Создайте **новый** OAuth client с типом **TVs and Limited Input devices** и используйте его ID и секрет |
| `access_denied` | Доступ отклонён на экране согласия | Повторите Connect и подтвердите доступ |
| `admin_policy_enforced` | Администратор Google Workspace блокирует сторонние приложения | Разрешите приложение в админке или используйте личный аккаунт |
| Каждую неделю просит переподключиться | Приложение осталось в статусе Testing | Переведите OAuth consent screen в **In production** |
| `rate limit exceeded` / 429 | Слишком много операций | Подождите; плагин повторит с задержкой |
| Папка не находится после подключения | Файлы созданы другим OAuth-клиентом или вручную | Используйте один и тот же Client ID на всех устройствах; папку создаёт плагин |

## Проверено / не проверено

- Факты о scope, статусах и 7-дневном refresh token подтверждены документацией Google (см. `RESEARCH_NOTES.md`).
- Device flow в плагине реализован и покрыт unit-тестами (этап 02).
- Живой запрос к `/device/code` 2026-10-19 подтвердил: клиент неверного типа Google отклоняет с `invalid_client: Invalid client type` (см. troubleshooting).
- Пошаговый проход этой инструкции в живом Google Cloud Console ещё не выполнялся — выполняется при первом подключении.
