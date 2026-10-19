# Источники и проверенные факты

Все ссылки проверены 2026-10-19. Факты перечислены так, как они использованы в архитектуре; спорные места отмечены как открытые вопросы.

## Google OAuth / Drive

### OAuth 2.0 for Desktop Apps
https://developers.google.com/identity/protocols/oauth2/native-app

- Loopback IP (`http://127.0.0.1:port`) — рекомендуемый redirect для desktop (Windows/macOS/Linux).
- Loopback **deprecated** для Android, Chrome app и iOS client types.
- Custom URI scheme редиректы больше **не поддерживаются** из-за риска подмены приложения.
- Manual copy/paste (OOB) не поддерживается.
- Desktop apps — public clients; рекомендуется PKCE (S256).
- Обновление токена: `grant_type=refresh_token`, client_secret опционален; refresh token валиден до отзыва.
- В документе появилось упоминание DPoP как опции для защиты токенов.

### OAuth 2.0 for TV and Limited-Input Device Applications
https://developers.google.com/identity/protocols/oauth2/limited-input-device

- Flow: `POST /device/code` → `user_code` + `verification_url` → пользователь вводит код в браузере → плагин опрашивает `/token` (`grant_type=urn:ietf:params:oauth:grant-type:device_code`).
- Ответы polling: `authorization_pending` (428), `slow_down` (403), `access_denied` (403), успех → access + refresh token.
- **Refresh token выдаётся всегда.**
- Разрешённые scope ограничены; из Drive это ровно `drive.appdata` и `drive.file`.
- Требуется client type «TVs and Limited Input devices»; `invalid_client` при неверном типе.
- Позиционирование: устройства без браузера или с ограниченным вводом. Использование на телефоне — допустимо технически, но это политический риск (зафиксировано в открытых вопросах).

### Choose Google Drive API scopes
https://developers.google.com/drive/api/guides/api-specific-auth

- `drive.file` — **non-sensitive**: создание и изменение только тех файлов, которые приложение создало само или которые пользователь открыл через Picker/файловый выбор приложения.
- Restricted: `drive`, `drive.readonly`, `drive.metadata.readonly`, `drive.activity*` и др. Требуют restricted scope verification; при хранении данных restricted scope на серверах — security assessment.
- Настоятельно рекомендуется per-file доступ: `drive.file` + Google Picker.
- `drive.appdata`/`drive.appfolder` — non-sensitive, но данные скрыты от пользователя в интерфейсе Drive.

### Using OAuth 2.0 to Access Google APIs (overview)
https://developers.google.com/identity/protocols/oauth2

- Подтверждено: проект с OAuth consent screen external user type и статусом **Testing** получает refresh token со сроком жизни **7 дней**, кроме случаев, когда запрошены только name/email/profile.
- Следствие: для `drive.file` в Testing режиме переподключение каждую неделю; нужен статус **In production**.

### OAuth App Verification Help Center
https://support.google.com/cloud/answer/13463073

- Приложения только с **non-sensitive** scope **не обязаны** проходить верификацию.
- Если нужно показывать имя и логотип на consent screen — требуется «brand verification» (облегчённая процедура).
- Для sensitive/restricted scope верификация обязательна.

## Obsidian

### obsidian-releases (README)
https://github.com/obsidianmd/obsidian-releases

- `community-plugins.json` — список плагинов; `community-plugin-stats.json` — статистика загрузок.
- Obsidian скачивает `manifest.json` и `README.md` из репозитория, а файлы релиза (`manifest.json`, `main.js`, `styles.css`) — из GitHub Release по тегу, совпадающему с версией.
- `versions.json` используется для подбора совместимой версии плагина.
- Ссылка на инструкцию подачи и developer policies (docs.obsidian.md).

### plugin-review.md
https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md

- Документ перенесён в `docs.obsidian.md/Plugins/Releasing/Plugin+guidelines`; саму страницу guidelines в текущем окружении получить не удалось (пустой ответ). Перед подачей прочитать вручную.

### Статистика по Drive-плагинам (community-plugins.json / community-plugin-stats.json, 2026-10-19)

- Remotely Save — 2 316 166 загрузок.
- Google Drive Sync (richardx366) — 191 841.
- Sync Engine — 47 908; Air Sync — 8 475; NeoGDSync — 1 814; Google Drive Vault Sync — 1 644; Google Drive Merge Sync — 1 252; Tether — 1 211; DriveSync — 504; GSync — 452; Multi Cloud Sync — 398; Google Sync (google-cloud-sync) — 309; OmniDrive — 287; Drive Bridge — 278; OmniSync GDrive — 203; NSync — 147.
- Проверка коллизий: id `gdrive-byo-sync` и имя `GDrive BYO Sync` на дату проверки свободны.

## Remotely Save

https://github.com/remotely-save/remotely-save
https://github.com/remotely-save/remotely-save/blob/master/docs/remote_services/googledrive/README.md

- Google Drive — PRO (платная) функция.
- OAuth через сайт автора: пользователь получает код на сайте и вставляет его в плагин. Причина: «Google Drive's api doesn't fit into the special environment of Obsidian plugin. So we need a website».
- Используется `drive.file`: плагин видит только созданные им файлы; ручная загрузка файлов не подхватывается; дубликаты имён в Drive могут ломать синхронизацию.
- Mobile поддерживается; есть docs по sync algorithm v3, E2E-шифрование, basic conflict бесплатно, smart conflict в PRO.

## Открытые вопросы (требуют проверки)

1. Поддерживает ли `changes.list` scope `drive.file`? Если да — можно удешевить remote-скан. Пока архитектура исходит из полного `files.list`.
2. Как Obsidian mobile открывает внешние URL из плагина: системный браузер или встроенный WebView? Встроенный WebView Google отвергает (`disallowed_useragent`).
3. Поддерживает ли Obsidian `requestUrl` передачу `ArrayBuffer` в body и получение `arrayBuffer` на mobile в текущих версиях? Ожидается да, нужно проверить в реализации.
4. Поведение Obsidian iOS при уходе в фон во время device flow polling.
5. Версия Obsidian на устройствах (macOS уточнён: 13+) — влияет на `minAppVersion`.
6. Google brand guidelines по слову «GDrive» в названии плагина.
7. Актуальные plugin guidelines Obsidian (страница не открылась в этом окружении).
