import { AuthError } from "./errors";
import { DeviceCodeInfo, TokenGrant } from "./types";

export const DEVICE_CODE_URL = "https://oauth2.googleapis.com/device/code";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const DEVICE_CODE_GRANT_TYPE =
  "urn:ietf:params:oauth:grant-type:device_code";

export const DEFAULT_POLL_INTERVAL_SEC = 5;
export const MIN_POLL_INTERVAL_SEC = 5;
export const MAX_POLL_INTERVAL_SEC = 60;
export const TOKEN_EXPIRY_SKEW_MS = 60_000;

type JsonObject = Record<string, unknown>;

export function buildFormBody(
  params: Record<string, string | undefined>
): string {
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value === undefined || value === "") {
      continue;
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  return parts.join("&");
}

export interface OAuthErrorInfo {
  code: string | null;
  message: string;
}

export function parseOAuthError(status: number, text: string): OAuthErrorInfo {
  const data = tryParseJson(text);
  return {
    code: readString(data, "error"),
    message:
      readString(data, "error_description") ??
      readString(data, "error_message") ??
      `Google OAuth request failed with HTTP ${status}.`,
  };
}

export function parseDeviceCodeResponse(text: string): DeviceCodeInfo {
  const data = tryParseJson(text);
  const deviceCode = readString(data, "device_code");
  const userCode = readString(data, "user_code");
  const verificationUrl =
    readString(data, "verification_url") ??
    readString(data, "verification_uri");

  if (!deviceCode || !userCode || !verificationUrl) {
    throw new AuthError(
      "invalid_response",
      "Google returned an invalid device code response."
    );
  }

  const expiresInSec = readNumber(data, "expires_in") ?? 1800;
  const intervalSec = readNumber(data, "interval") ?? DEFAULT_POLL_INTERVAL_SEC;

  return {
    deviceCode,
    userCode,
    verificationUrl,
    expiresInSec: expiresInSec > 0 ? expiresInSec : 1800,
    intervalSec:
      intervalSec > 0 ? intervalSec : DEFAULT_POLL_INTERVAL_SEC,
  };
}

export type TokenPollResult =
  | { kind: "success"; grant: TokenGrant }
  | { kind: "pending" }
  | { kind: "slow_down" }
  | { kind: "denied"; message: string }
  | { kind: "expired"; message: string }
  | { kind: "error"; code: string | null; message: string };

export function classifyTokenPoll(
  status: number,
  text: string
): TokenPollResult {
  const data = tryParseJson(text);

  if (status >= 200 && status < 300) {
    try {
      return { kind: "success", grant: parseTokenGrant(data) };
    } catch (error) {
      return {
        kind: "error",
        code: "invalid_response",
        message:
          error instanceof Error
            ? error.message
            : "Google returned an invalid token response.",
      };
    }
  }

  const code = readString(data, "error");
  const message =
    readString(data, "error_description") ??
    readString(data, "error_message") ??
    `Google OAuth request failed with HTTP ${status}.`;

  switch (code) {
    case "authorization_pending":
      return { kind: "pending" };
    case "slow_down":
      return { kind: "slow_down" };
    case "access_denied":
      return { kind: "denied", message };
    case "expired_token":
      return { kind: "expired", message };
    default:
      // Some Google endpoints answer 428 instead of authorization_pending.
      if (status === 428) {
        return { kind: "pending" };
      }
      return { kind: "error", code, message };
  }
}

export type RefreshResult =
  | { kind: "success"; grant: TokenGrant }
  | { kind: "invalid_grant"; message: string }
  | { kind: "error"; code: string | null; message: string };

export function classifyRefreshResponse(
  status: number,
  text: string
): RefreshResult {
  const data = tryParseJson(text);

  if (status >= 200 && status < 300) {
    try {
      return { kind: "success", grant: parseTokenGrant(data) };
    } catch (error) {
      return {
        kind: "error",
        code: "invalid_response",
        message:
          error instanceof Error
            ? error.message
            : "Google returned an invalid token response.",
      };
    }
  }

  const code = readString(data, "error");
  const message =
    readString(data, "error_description") ??
    readString(data, "error_message") ??
    `Google OAuth request failed with HTTP ${status}.`;

  if (code === "invalid_grant") {
    return { kind: "invalid_grant", message };
  }

  return { kind: "error", code, message };
}

export function nextPollInterval(current: number, slowDown: boolean): number {
  if (!slowDown) {
    return Math.max(MIN_POLL_INTERVAL_SEC, current);
  }
  return Math.min(
    MAX_POLL_INTERVAL_SEC,
    Math.max(MIN_POLL_INTERVAL_SEC, current) + 5
  );
}

export function isTokenValid(expiresAt: number, nowMs: number): boolean {
  return expiresAt - TOKEN_EXPIRY_SKEW_MS > nowMs;
}

export function sleepWithSignal(
  ms: number,
  signal?: AbortSignal
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AuthError("cancelled", "Google sign-in cancelled."));
      return;
    }

    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new AuthError("cancelled", "Google sign-in cancelled."));
    };

    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
      resolve();
    }, ms);

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

function parseTokenGrant(data: JsonObject | null): TokenGrant {
  const accessToken = readString(data, "access_token");
  const expiresInSec = readNumber(data, "expires_in");

  if (!accessToken || expiresInSec === null || expiresInSec <= 0) {
    throw new AuthError(
      "invalid_response",
      "Google returned an invalid token response."
    );
  }

  return {
    accessToken,
    refreshToken: readString(data, "refresh_token"),
    expiresInSec,
    scope: readString(data, "scope"),
    tokenType: readString(data, "token_type"),
  };
}

function tryParseJson(text: string): JsonObject | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
    return null;
  } catch {
    return null;
  }
}

function readString(data: JsonObject | null, key: string): string | null {
  if (!data) {
    return null;
  }
  const value = data[key];
  return typeof value === "string" ? value : null;
}

function readNumber(data: JsonObject | null, key: string): number | null {
  if (!data) {
    return null;
  }
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
