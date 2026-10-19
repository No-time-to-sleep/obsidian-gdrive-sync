import { Notice, Plugin } from "obsidian";
import { AuthManager } from "./auth/auth-manager";
import type { AuthStateStore } from "./auth/auth-manager";
import { DeviceCodeModal } from "./auth/device-code-modal";
import { AuthError } from "./auth/errors";
import { ObsidianHttpClient } from "./auth/obsidian-http-client";
import { AuthStatus, StoredAuth, isStoredAuth } from "./auth/types";
import {
  DEFAULT_SETTINGS,
  GDriveByoSettingsTab,
  GDriveByoSyncSettings,
} from "./settings";

interface PluginData {
  settings: GDriveByoSyncSettings;
  auth: StoredAuth | null;
}

export default class GDriveByoSyncPlugin extends Plugin {
  settings: GDriveByoSyncSettings = { ...DEFAULT_SETTINGS };

  private authManager: AuthManager | null = null;
  private authData: StoredAuth | null = null;
  private settingsTab: GDriveByoSettingsTab | null = null;
  private connectController: AbortController | null = null;
  private connectInProgress = false;

  async onload(): Promise<void> {
    await this.loadPluginData();

    const store: AuthStateStore = {
      load: async () => this.authData,
      save: async (auth) => {
        this.authData = auth;
        await this.persistPluginData();
      },
    };

    this.authManager = new AuthManager({
      http: new ObsidianHttpClient(),
      store,
    });
    await this.authManager.load();

    this.settingsTab = new GDriveByoSettingsTab(this.app, this);
    this.addSettingTab(this.settingsTab);

    this.addCommand({
      id: "connect-google-drive",
      name: "Connect Google Drive",
      callback: () => {
        void this.startConnectFlow();
      },
    });

    this.addCommand({
      id: "disconnect-google-drive",
      name: "Disconnect Google Drive",
      callback: () => {
        void this.disconnectGoogleDrive();
      },
    });

    this.addCommand({
      id: "show-auth-status",
      name: "Show auth status",
      callback: () => {
        new Notice(`GDrive BYO Sync: ${this.describeStatus()}.`);
      },
    });
  }

  onunload(): void {
    this.connectController?.abort();
    this.connectController = null;
  }

  getAuthStatus(): AuthStatus {
    return this.authManager?.getStatus() ?? "disconnected";
  }

  async saveSettings(): Promise<void> {
    await this.persistPluginData();
  }

  async startConnectFlow(): Promise<void> {
    if (this.connectInProgress) {
      new Notice("GDrive BYO Sync: connection is already in progress.");
      return;
    }

    if (!this.settings.clientId.trim() || !this.settings.clientSecret.trim()) {
      new Notice(
        "GDrive BYO Sync: fill in the OAuth client ID and client secret first."
      );
      return;
    }

    const manager = this.authManager;
    if (!manager) {
      return;
    }

    this.connectInProgress = true;
    const controller = new AbortController();
    this.connectController = controller;
    const ui: { modal: DeviceCodeModal | null } = { modal: null };

    try {
      await manager.connect(
        {
          clientId: this.settings.clientId.trim(),
          clientSecret: this.settings.clientSecret.trim(),
        },
        (info) => {
          ui.modal = new DeviceCodeModal(this.app, info, () => {
            controller.abort();
          });
          ui.modal.open();
        },
        controller.signal
      );

      ui.modal?.markCompleted();
      ui.modal?.close();
      new Notice("GDrive BYO Sync: Google Drive connected.");
      this.settingsTab?.display();
    } catch (error) {
      const authError =
        error instanceof AuthError
          ? error
          : new AuthError("unknown", String(error));

      if (authError.code === "cancelled") {
        ui.modal?.close();
      } else {
        ui.modal?.setStatus(authError.message, "error");
        new Notice(`GDrive BYO Sync: ${authError.message}`);
      }
    } finally {
      if (this.connectController === controller) {
        this.connectController = null;
      }
      this.connectInProgress = false;
    }
  }

  async disconnectGoogleDrive(): Promise<void> {
    if (!this.authManager) {
      return;
    }

    try {
      await this.authManager.disconnect();
      new Notice("GDrive BYO Sync: disconnected. Stored tokens were removed.");
      this.settingsTab?.display();
    } catch (error) {
      new Notice(
        `GDrive BYO Sync: could not disconnect completely: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private describeStatus(): string {
    switch (this.getAuthStatus()) {
      case "connected":
        return "connected";
      case "expired":
        return "connected, the access token will be refreshed on the next request";
      case "disconnected":
        return "not connected";
      default:
        return "unknown";
    }
  }

  private async loadPluginData(): Promise<void> {
    const raw: unknown = await this.loadData();
    if (!raw || typeof raw !== "object") {
      return;
    }

    const data = raw as Record<string, unknown>;
    const settings = data.settings;

    if (settings && typeof settings === "object") {
      const record = settings as Record<string, unknown>;
      this.settings = {
        clientId:
          typeof record.clientId === "string" ? record.clientId : "",
        clientSecret:
          typeof record.clientSecret === "string" ? record.clientSecret : "",
      };
    }

    this.authData = isStoredAuth(data.auth) ? data.auth : null;
  }

  private async persistPluginData(): Promise<void> {
    const data: PluginData = {
      settings: this.settings,
      auth: this.authData,
    };
    await this.saveData(data);
  }
}
