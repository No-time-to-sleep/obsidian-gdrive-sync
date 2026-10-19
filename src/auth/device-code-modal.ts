import { App, Modal, Notice, Setting } from "obsidian";
import { DeviceCodeInfo } from "./types";

type StatusKind = "info" | "success" | "error";

/**
 * Shows the Google device code while the auth manager polls for completion.
 * Closing the modal cancels the pending sign-in.
 */
export class DeviceCodeModal extends Modal {
  private statusEl: HTMLElement | null = null;
  private completed = false;

  constructor(
    app: App,
    private readonly info: DeviceCodeInfo,
    private readonly onCancel: () => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Connect Google Drive" });
    contentEl.createEl("p", {
      text: "Open the Google page, sign in, and enter the code below.",
    });

    contentEl.createEl("div", {
      text: this.info.userCode,
      cls: "gdrive-byo-device-code",
    });

    const urlEl = contentEl.createEl("p", { cls: "gdrive-byo-hint" });
    const link = urlEl.createEl("a", { text: this.info.verificationUrl });
    link.setAttribute("href", this.info.verificationUrl);
    link.addEventListener("click", (event) => {
      event.preventDefault();
      this.openVerificationPage();
    });

    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText("Open Google page")
          .setCta()
          .onClick(() => {
            this.openVerificationPage();
          })
      )
      .addButton((button) =>
        button.setButtonText("Copy code").onClick(() => {
          void this.copyCode();
        })
      );

    this.statusEl = contentEl.createEl("p", {
      text: "Waiting for confirmation in the browser...",
      cls: "gdrive-byo-status",
    });

    new Setting(contentEl).addButton((button) =>
      button.setButtonText("Cancel").onClick(() => {
        this.close();
      })
    );
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.completed) {
      this.onCancel();
    }
  }

  markCompleted(): void {
    this.completed = true;
  }

  setStatus(text: string, kind: StatusKind = "info"): void {
    if (!this.statusEl) {
      return;
    }
    this.statusEl.setText(text);
    this.statusEl.className = `gdrive-byo-status gdrive-byo-status-${kind}`;
  }

  private openVerificationPage(): void {
    window.open(this.info.verificationUrl, "_blank");
  }

  private async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.info.userCode);
      new Notice("Code copied to clipboard.");
    } catch {
      new Notice(
        "Could not copy automatically. Select the code and copy it manually."
      );
    }
  }
}
