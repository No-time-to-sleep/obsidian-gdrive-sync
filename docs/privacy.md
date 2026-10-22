---
title: Privacy Policy
---

# Privacy Policy — GDrive BYO Sync

Last updated: 23 October 2026

GDrive BYO Sync is an Obsidian plugin that synchronizes a vault with Google Drive using an OAuth client that you create and own in your own Google Cloud project ("bring your own credentials").

## Data the plugin accesses

- Files in your Obsidian vault that are selected for synchronization (by default the vault, excluding configured ignore patterns).
- Files and folders in Google Drive that the plugin creates or opens using the `https://www.googleapis.com/auth/drive.file` scope. The plugin cannot see other files in your Drive.
- The Google OAuth client ID and client secret that you enter in the plugin settings.
- OAuth access and refresh tokens issued by Google.

## Where data is stored

- OAuth client ID/secret, access and refresh tokens, settings, and synchronization state are stored locally in the plugin's `data.json` file inside your vault at `.obsidian/plugins/gdrive-byo-sync/`.
- Synced file contents are stored in your Obsidian vault and in your own Google Drive account.
- The author does not operate any servers and does not receive or store your data.

## Network connections

The plugin communicates only with Google endpoints:

- `accounts.google.com` — OAuth sign-in pages
- `oauth2.googleapis.com` — OAuth token and device-code endpoints
- `www.googleapis.com` — Google Drive API

There are no analytics, telemetry, advertising, or third-party services.

## Data sharing

The author does not collect, access, sell, or share your data. Data is exchanged only between your device and Google, using your own Google account and OAuth client.

## Google API Services User Data Policy

The plugin's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Data retention and deletion

- Use **Disconnect Google Drive** in the plugin to revoke the refresh token and remove stored tokens.
- Delete `.obsidian/plugins/gdrive-byo-sync/data.json` (or the whole plugin folder) to remove all locally stored plugin data.
- Revoke the app's access at [https://myaccount.google.com/permissions](https://myaccount.google.com/permissions).
- Files in Google Drive can be deleted or trashed by you at any time.

## Security

Tokens are stored locally and rely on your device's access controls. Anyone with access to your vault folder and `data.json` may be able to use the stored tokens. Protect your device and backups, and do not sync or publish `data.json`.

## Children

The plugin is not directed to children under 13.

## Changes

Updates to this policy are published in this repository.

## Contact

Open an issue: [https://github.com/No-time-to-sleep/obsidian-gdrive-sync/issues](https://github.com/No-time-to-sleep/obsidian-gdrive-sync/issues)
