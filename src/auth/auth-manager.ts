import {
  buildFormBody,
  classifyRefreshResponse,
  classifyTokenPoll,
  DEVICE_CODE_GRANT_TYPE,
  DEVICE_CODE_URL,
  isTokenValid,
  nextPollInterval,
  parseDeviceCodeResponse,
  parseOAuthError,
  REVOKE_URL,
  sleepWithSignal,
  TOKEN_URL,
} from "./device-flow";
import { AuthError, toAuthError } from "./errors";
import { HttpClient, HttpResponse } from "./http";
import {
  AuthStatus,
  DeviceCodeInfo,
  DRIVE_FILE_SCOPE,
  OAuthCredentials,
  StoredAuth,
  TokenGrant,
} from "./types";

export interface AuthStateStore {
  load(): Promise<StoredAuth | null>;
  save(auth: StoredAuth | null): Promise<void>;
}

export interface AuthManagerOptions {
  http: HttpClient;
  store: AuthStateStore;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export type DeviceCodeHandler = (info: DeviceCodeInfo) => void;

/**
 * Owns the OAuth device flow and token lifecycle. Knows nothing about
 * Obsidian: the plugin supplies a transport and a persistence adapter.
 */
export class AuthManager {
  private readonly http: HttpClient;
  private readonly store: AuthStateStore;
  private readonly now: () => number;
  private readonly sleep: (
    ms: number,
    signal?: AbortSignal
  ) => Promise<void>;
  private current: StoredAuth | null = null;

  constructor(options: AuthManagerOptions) {
    this.http = options.http;
    this.store = options.store;
    this.now = options.now ?? (() => Date.now());
    this.sleep = options.sleep ?? sleepWithSignal;
  }

  async load(): Promise<void> {
    this.current = await this.store.load();
  }

  getStatus(): AuthStatus {
    if (!this.current) {
      return "disconnected";
    }
    return isTokenValid(this.current.expiresAt, this.now())
      ? "connected"
      : "expired";
  }

  async connect(
    credentials: OAuthCredentials,
    onDeviceCode: DeviceCodeHandler,
    signal?: AbortSignal
  ): Promise<StoredAuth> {
    this.assertCredentials(credentials);

    const codeResponse = await this.postForm(DEVICE_CODE_URL, {
      client_id: credentials.clientId,
      scope: DRIVE_FILE_SCOPE,
    });

    if (codeResponse.status < 200 || codeResponse.status >= 300) {
      const error = parseOAuthError(codeResponse.status, codeResponse.text);
      throw new AuthError(
        error.code === "invalid_client" ? "invalid_client" : "unknown",
        this.friendlyError(error.code, error.message)
      );
    }

    const code = parseDeviceCodeResponse(codeResponse.text);
    onDeviceCode(code);

    const deadline = this.now() + code.expiresInSec * 1000;
    let interval = code.intervalSec;

    while (this.now() < deadline) {
      await this.sleep(interval * 1000, signal);

      if (signal?.aborted) {
        throw new AuthError("cancelled", "Google sign-in cancelled.");
      }

      const response = await this.postForm(TOKEN_URL, {
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        device_code: code.deviceCode,
        grant_type: DEVICE_CODE_GRANT_TYPE,
      });

      const result = classifyTokenPoll(response.status, response.text);

      switch (result.kind) {
        case "success": {
          const auth = this.toStoredAuth(result.grant, null);
          await this.persist(auth);
          return auth;
        }
        case "pending":
          continue;
        case "slow_down":
          interval = nextPollInterval(interval, true);
          continue;
        case "denied":
          throw new AuthError("access_denied", result.message);
        case "expired":
          throw new AuthError("expired_token", result.message);
        case "error":
          throw new AuthError(
            result.code === "invalid_client" ? "invalid_client" : "unknown",
            this.friendlyError(result.code, result.message)
          );
      }
    }

    throw new AuthError(
      "expired_token",
      "The Google sign-in code expired. Start the connection again."
    );
  }

  async getAccessToken(credentials: OAuthCredentials): Promise<string> {
    const auth = this.current;
    if (!auth) {
      throw new AuthError(
        "not_connected",
        "Google Drive is not connected. Connect it in the plugin settings."
      );
    }

    if (isTokenValid(auth.expiresAt, this.now())) {
      return auth.accessToken;
    }

    return this.refresh(credentials, auth);
  }

  async disconnect(): Promise<void> {
    const refreshToken = this.current?.refreshToken ?? null;

    await this.store.save(null);
    this.current = null;

    if (!refreshToken) {
      return;
    }

    try {
      await this.http.request({
        url: REVOKE_URL,
        method: "POST",
        contentType: "application/x-www-form-urlencoded",
        body: buildFormBody({ token: refreshToken }),
      });
    } catch {
      // Best effort: local tokens are already gone.
    }
  }

  private async refresh(
    credentials: OAuthCredentials,
    auth: StoredAuth
  ): Promise<string> {
    this.assertCredentials(credentials);

    const response = await this.postForm(TOKEN_URL, {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: auth.refreshToken,
      grant_type: "refresh_token",
    });

    const result = classifyRefreshResponse(response.status, response.text);

    if (result.kind === "success") {
      const next = this.toStoredAuth(result.grant, auth.refreshToken);
      await this.persist(next);
      return next.accessToken;
    }

    if (result.kind === "invalid_grant") {
      throw new AuthError(
        "invalid_grant",
        "Google sign-in has expired. Reconnect Google Drive in the plugin settings."
      );
    }

    throw new AuthError("unknown", result.message);
  }

  private toStoredAuth(
    grant: TokenGrant,
    fallbackRefreshToken: string | null
  ): StoredAuth {
    const refreshToken = grant.refreshToken ?? fallbackRefreshToken;

    if (!refreshToken) {
      throw new AuthError(
        "invalid_response",
        "Google did not return a refresh token. Check the OAuth project status and try again."
      );
    }

    return {
      accessToken: grant.accessToken,
      refreshToken,
      expiresAt: this.now() + grant.expiresInSec * 1000,
      scope: grant.scope ?? DRIVE_FILE_SCOPE,
      tokenType: grant.tokenType ?? "Bearer",
    };
  }

  private async persist(auth: StoredAuth): Promise<void> {
    await this.store.save(auth);
    this.current = auth;
  }

  private assertCredentials(credentials: OAuthCredentials): void {
    if (!credentials.clientId.trim() || !credentials.clientSecret.trim()) {
      throw new AuthError(
        "invalid_client",
        "Fill in the OAuth client ID and client secret in the plugin settings."
      );
    }
  }

  private friendlyError(code: string | null, message: string): string {
    if (code === "invalid_client") {
      return `Google rejected the OAuth client. ${message} Check that the client type is "TVs and Limited Input devices" and that the client ID and client secret are copied completely.`;
    }
    return message;
  }

  private async postForm(
    url: string,
    params: Record<string, string | undefined>
  ): Promise<HttpResponse> {
    try {
      return await this.http.request({
        url,
        method: "POST",
        contentType: "application/x-www-form-urlencoded",
        body: buildFormBody(params),
      });
    } catch (error) {
      throw toAuthError(error);
    }
  }
}
