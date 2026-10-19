import { Notice, Plugin } from "obsidian";

/**
 * Scaffold plugin (stage 01).
 *
 * Sync, auth and Drive access are not implemented yet.
 * Architecture: docs/ARCHITECTURE.md, algorithm: docs/SYNC_ALGORITHM.md.
 */
export default class GDriveByoSyncPlugin extends Plugin {
  async onload(): Promise<void> {
    this.addCommand({
      id: "show-scaffold-status",
      name: "Show scaffold status",
      callback: () => {
        new Notice(
          "GDrive BYO Sync: scaffold loaded. Sync is not implemented yet."
        );
      },
    });
  }

  onunload(): void {
    // Cleanup will be added together with the scheduler and network clients.
  }
}
