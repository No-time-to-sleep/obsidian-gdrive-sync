import { describe, expect, it } from "vitest";
import {
  TOKEN_EXPIRY_SKEW_MS,
  buildFormBody,
  classifyRefreshResponse,
  classifyTokenPoll,
  isTokenValid,
  nextPollInterval,
  parseDeviceCodeResponse,
  parseOAuthError,
} from "../src/auth/device-flow";
import { AuthError } from "../src/auth/errors";
import { DRIVE_FILE_SCOPE } from "../src/auth/types";

const deviceCodeJson = JSON.stringify({
  device_code: "dev-code",
  user_code: "ABCD-EFGH",
  verification_url: "https://www.google.com/device",
  expires_in: 1800,
  interval: 5,
});

describe("buildFormBody", () => {
  it("encodes keys and values and skips empty ones", () => {
    expect(
      buildFormBody({
        client_id: "abc",
        scope: DRIVE_FILE_SCOPE,
        empty: "",
        missing: undefined,
      })
    ).toBe(
      "client_id=abc&scope=" + encodeURIComponent(DRIVE_FILE_SCOPE)
    );
  });
});

describe("parseDeviceCodeResponse", () => {
  it("parses the Google device code response", () => {
    expect(parseDeviceCodeResponse(deviceCodeJson)).toEqual({
      deviceCode: "dev-code",
      userCode: "ABCD-EFGH",
      verificationUrl: "https://www.google.com/device",
      expiresInSec: 1800,
      intervalSec: 5,
    });
  });

  it("supports verification_uri and defaults the interval", () => {
    const info = parseDeviceCodeResponse(
      JSON.stringify({
        device_code: "d",
        user_code: "u",
        verification_uri: "https://example.com/device",
        expires_in: 600,
      })
    );
    expect(info.verificationUrl).toBe("https://example.com/device");
    expect(info.intervalSec).toBe(5);
  });

  it("rejects malformed responses", () => {
    expect(() => parseDeviceCodeResponse("{}")).toThrowError(AuthError);
    expect(() => parseDeviceCodeResponse("not json")).toThrowError(AuthError);
  });
});

describe("parseOAuthError", () => {
  it("extracts the error code and description", () => {
    expect(
      parseOAuthError(
        401,
        JSON.stringify({
          error: "invalid_client",
          error_description: "Unauthorized",
        })
      )
    ).toEqual({ code: "invalid_client", message: "Unauthorized" });
  });

  it("falls back to the HTTP status", () => {
    expect(parseOAuthError(500, "boom")).toEqual({
      code: null,
      message: "Google OAuth request failed with HTTP 500.",
    });
  });
});

describe("classifyTokenPoll", () => {
  it("returns tokens on success", () => {
    const result = classifyTokenPoll(
      200,
      JSON.stringify({
        access_token: "at",
        refresh_token: "rt",
        expires_in: 3600,
        scope: DRIVE_FILE_SCOPE,
        token_type: "Bearer",
      })
    );

    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.grant.accessToken).toBe("at");
      expect(result.grant.refreshToken).toBe("rt");
      expect(result.grant.expiresInSec).toBe(3600);
    }
  });

  it("maps polling error codes", () => {
    const cases: Array<[string, string]> = [
      ["authorization_pending", "pending"],
      ["slow_down", "slow_down"],
      ["access_denied", "denied"],
      ["expired_token", "expired"],
    ];

    for (const [code, kind] of cases) {
      const result = classifyTokenPoll(
        400,
        JSON.stringify({ error: code, error_description: "x" })
      );
      expect(result.kind, code).toBe(kind);
    }
  });

  it("treats HTTP 428 as pending", () => {
    expect(classifyTokenPoll(428, "{}").kind).toBe("pending");
  });

  it("surfaces invalid_client as an error", () => {
    const result = classifyTokenPoll(
      401,
      JSON.stringify({
        error: "invalid_client",
        error_description: "bad client",
      })
    );

    expect(result).toMatchObject({
      kind: "error",
      code: "invalid_client",
      message: "bad client",
    });
  });

  it("does not accept a 2xx response without tokens", () => {
    expect(classifyTokenPoll(200, "{}").kind).toBe("error");
  });
});

describe("classifyRefreshResponse", () => {
  it("detects invalid_grant", () => {
    const result = classifyRefreshResponse(
      400,
      JSON.stringify({ error: "invalid_grant" })
    );
    expect(result.kind).toBe("invalid_grant");
  });

  it("parses a successful refresh", () => {
    const result = classifyRefreshResponse(
      200,
      JSON.stringify({ access_token: "new", expires_in: 3599 })
    );
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.grant.accessToken).toBe("new");
      expect(result.grant.refreshToken).toBeNull();
    }
  });
});

describe("poll timing", () => {
  it("increases the interval on slow_down and caps it", () => {
    expect(nextPollInterval(5, false)).toBe(5);
    expect(nextPollInterval(5, true)).toBe(10);
    expect(nextPollInterval(60, true)).toBe(60);
    expect(nextPollInterval(1, false)).toBe(5);
  });

  it("treats a token as expired one minute early", () => {
    const now = 1_000_000;
    expect(isTokenValid(now + TOKEN_EXPIRY_SKEW_MS + 1, now)).toBe(true);
    expect(isTokenValid(now + TOKEN_EXPIRY_SKEW_MS, now)).toBe(false);
    expect(isTokenValid(now, now)).toBe(false);
  });
});
