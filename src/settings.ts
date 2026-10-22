import { App, PluginSettingTab, Setting } from "obsidian";
import type GDriveByoSyncPlugin from "./main";
import { AuthStatus } from "./auth/types";

export interface GDriveByoSyncSettings {
  clientId: string;
  clientSecret: string;
}

export const DEFAULT_SETTINGS: GDriveByoSyncSettings = {
  clientId: "",
  clientSecret: "",
};

export const SETUP_GUIDE_URL =
  "https://github.com/No-time-to-sleep/obsidian-gdrive-sync/blob/main/docs/GOOGLE_CLOUD_SETUP.md";

function describeStatus(status: AuthStatus): string {
  switch (status) {
    case "connected":
      return "Connected. The access token is valid.";
    case "expired":
      return "Connected. The access token expired and will be refreshed on the next request.";
    case "disconnected":
      return "Not connected.";
  }
}

export class GDriveByoSettingsTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: GDriveByoSyncPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "GDrive BYO Sync" });

    containerEl.createEl("p", {
      text:
        "This plugin talks to Google Drive with your own OAuth client, so no third-party server ever sees your notes. One client can be reused on all your devices.",
      cls: "gdrive-byo-hint",
    });

    containerEl.createEl("h3", { text: "Setup" });

    const steps = containerEl.createEl("ol", { cls: "gdrive-byo-steps" });
    steps.createEl("li", {
      text: "Create a Google Cloud project and enable the Google Drive API.",
    });
    steps.createEl("li", {
      text:
        'Create an OAuth client of type "TVs and Limited Input devices" (other client types cannot use this sign-in method).',
    });
    steps.createEl("li", {
      text:
        "Publish the app (In production) so the refresh token does not expire after 7 days.",
    });
    steps.createEl("li", {
      text: "Paste the client ID and client secret below, then press Connect.",
    });

    containerEl.createEl("h3", { text: "Credentials" });

    new Setting(containerEl)
      .setName("OAuth client ID")
      .setDesc("From Google Cloud Console > APIs & Services > Credentials.")
      .addText((text) =>
        text
          .setPlaceholder("1234567890-...apps.googleusercontent.com")
          .setValue(this.plugin.settings.clientId)
          .onChange(async (value) => {
            this.plugin.settings.clientId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("OAuth client secret")
      .setDesc(
        "Stored locally in this vault's data.json and sent only to Google. Copy the full value; it starts with GOCSPX-."
      )
      .addText((text) => {
        text
          .setPlaceholder("GOCSPX-...")
          .setValue(this.plugin.settings.clientSecret)
          .onChange(async (value) => {
            this.plugin.settings.clientSecret = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
      });

    const status = this.plugin.getAuthStatus();

    containerEl.createEl("h3", { text: "Connection" });

    new Setting(containerEl)
      .setName("Status")
      .setDesc(describeStatus(status))
      .addButton((button) =>
        button
          .setButtonText(status === "disconnected" ? "Connect" : "Reconnect")
          .setCta()
          .onClick(() => {
            void this.plugin.startConnectFlow();
          })
      );

    if (status !== "disconnected") {
      new Setting(containerEl)
        .setName("Disconnect")
        .setDesc(
          "Revoke the refresh token and remove stored tokens from this vault."
        )
        .addButton((button) =>
          button
            .setButtonText("Disconnect")
            .setWarning()
            .onClick(() => {
              void this.plugin.disconnectGoogleDrive();
            })
        );
    }

    new Setting(containerEl)
      .setName("Google Cloud setup guide")
      .setDesc("Step-by-step instructions for creating the OAuth client.")
      .addButton((button) =>
        button.setButtonText("Open guide").onClick(() => {
          window.open(SETUP_GUIDE_URL, "_blank");
        })
      );
  }
}
