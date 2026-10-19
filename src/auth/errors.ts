export type AuthErrorCode =
  | "not_connected"
  | "cancelled"
  | "expired_token"
  | "access_denied"
  | "invalid_client"
  | "invalid_grant"
  | "invalid_response"
  | "network"
  | "unknown";

/** Typed error for every failure that can happen during Google sign-in. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) {
    return error;
  }
  if (error instanceof Error) {
    return new AuthError("network", error.message);
  }
  return new AuthError("unknown", String(error));
}
