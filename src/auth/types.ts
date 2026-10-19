/**
 * `drive.file` is the only Drive scope allowed by the device flow that is not
 * considered sensitive. Do not widen it without an explicit project decision.
 */
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface DeviceCodeInfo {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresInSec: number;
  intervalSec: number;
}

export interface TokenGrant {
  accessToken: string;
  refreshToken: string | null;
  expiresInSec: number;
  scope: string | null;
  tokenType: string | null;
}

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  scope: string;
  tokenType: string;
}

export type AuthStatus = "disconnected" | "connected" | "expired";

export function isStoredAuth(value: unknown): value is StoredAuth {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.accessToken === "string" &&
    typeof record.refreshToken === "string" &&
    typeof record.expiresAt === "number" &&
    typeof record.scope === "string" &&
    typeof record.tokenType === "string"
  );
}
