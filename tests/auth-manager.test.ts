import { describe, expect, it } from "vitest";
import { AuthManager } from "../src/auth/auth-manager";
import type { AuthStateStore } from "../src/auth/auth-manager";
import {
  DEVICE_CODE_URL,
  REVOKE_URL,
  TOKEN_URL,
} from "../src/auth/device-flow";
import type { HttpClient, HttpRequest, HttpResponse } from "../src/auth/http";
import {
  DRIVE_FILE_SCOPE,
  type OAuthCredentials,
  type StoredAuth,
} from "../src/auth/types";

class QueueHttpClient implements HttpClient {
  readonly requests: HttpRequest[] = [];

  constructor(private readonly responses: HttpResponse[]) {}

  async request(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request);
    const response = this.responses.shift();
    if (!response) {
      throw new Error(`No queued response for ${request.url}`);
    }
    return response;
  }
}

class MemoryStore implements AuthStateStore {
  saved: StoredAuth | null;

  constructor(initial: StoredAuth | null = null) {
    this.saved = initial;
  }

  async load(): Promise<StoredAuth | null> {
    return this.saved;
  }

  async save(auth: StoredAuth | null): Promise<void> {
    this.saved = auth;
  }
}

const credentials: OAuthCredentials = {
  clientId: "client-id",
  clientSecret: "client-secret",
};

const deviceCodeBody = JSON.stringify({
  device_code: "dev-code",
  user_code: "ABCD-EFGH",
  verification_url: "https://www.google.com/device",
  expires_in: 600,
  interval: 5,
});

function tokenBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    access_token: "access-1",
    refresh_token: "refresh-1",
    expires_in: 3600,
    scope: DRIVE_FILE_SCOPE,
    token_type: "Bearer",
    ...overrides,
  });
}

function createClock(start = 1_000_000): {
  now: () => number;
  advance: (ms: number) => void;
} {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe("AuthManager.connect", () => {
  it("polls through pending and slow_down, then persists tokens", async () => {
    const client = new QueueHttpClient([
      { status: 200, text: deviceCodeBody },
      {
        status: 400,
        text: JSON.stringify({ error: "authorization_pending" }),
      },
      { status: 400, text: JSON.stringify({ error: "slow_down" }) },
      { status: 200, text: tokenBody() },
    ]);
    const store = new MemoryStore();
    const clock = createClock();
    const manager = new AuthManager({
      http: client,
      store,
      now: clock.now,
      sleep: async (ms) => {
        clock.advance(ms);
      },
    });

    let shownCode = "";
    const result = await manager.connect(credentials, (info) => {
      shownCode = info.userCode;
    });

    expect(shownCode).toBe("ABCD-EFGH");
    expect(result.refreshToken).toBe("refresh-1");
    expect(store.saved?.accessToken).toBe("access-1");
    expect(store.saved?.expiresAt).toBe(clock.now() + 3_600_000);
    expect(manager.getStatus()).toBe("connected");
    expect(client.requests).toHaveLength(4);

    expect(client.requests[0]?.url).toBe(DEVICE_CODE_URL);
    expect(client.requests[0]?.body).toContain("client_id=client-id");
    expect(client.requests[0]?.body).toContain(
      "scope=" + encodeURIComponent(DRIVE_FILE_SCOPE)
    );

    expect(client.requests[1]?.url).toBe(TOKEN_URL);
    expect(client.requests[1]?.body).toContain(
      "grant_type=" +
        encodeURIComponent("urn:ietf:params:oauth:grant-type:device_code")
    );
    expect(client.requests[1]?.body).toContain("device_code=dev-code");
  });

  it("fails when the device code expires", async () => {
    const client = new QueueHttpClient([
      {
        status: 200,
        text: JSON.stringify({
          device_code: "dev-code",
          user_code: "ABCD-EFGH",
          verification_url: "https://www.google.com/device",
          expires_in: 5,
          interval: 5,
        }),
      },
      {
        status: 400,
        text: JSON.stringify({ error: "authorization_pending" }),
      },
    ]);
    const clock = createClock();
    const manager = new AuthManager({
      http: client,
      store: new MemoryStore(),
      now: clock.now,
      sleep: async (ms) => {
        clock.advance(ms);
      },
    });

    await expect(manager.connect(credentials, () => undefined)).rejects.toMatchObject(
      { code: "expired_token" }
    );
  });

  it("reports denied consent", async () => {
    const client = new QueueHttpClient([
      { status: 200, text: deviceCodeBody },
      { status: 403, text: JSON.stringify({ error: "access_denied" }) },
    ]);
    const manager = new AuthManager({
      http: client,
      store: new MemoryStore(),
      now: () => 1_000_000,
      sleep: async () => undefined,
    });

    await expect(manager.connect(credentials, () => undefined)).rejects.toMatchObject(
      { code: "access_denied" }
    );
  });

  it("rejects missing credentials before any request", async () => {
    const client = new QueueHttpClient([]);
    const manager = new AuthManager({
      http: client,
      store: new MemoryStore(),
      sleep: async () => undefined,
    });

    await expect(
      manager.connect({ clientId: "", clientSecret: "" }, () => undefined)
    ).rejects.toMatchObject({ code: "invalid_client" });
    expect(client.requests).toHaveLength(0);
  });
});

describe("AuthManager.getAccessToken", () => {
  it("returns the cached token while it is valid", async () => {
    const clock = createClock();
    const stored: StoredAuth = {
      accessToken: "cached",
      refreshToken: "refresh-1",
      expiresAt: clock.now() + 120_000,
      scope: DRIVE_FILE_SCOPE,
      tokenType: "Bearer",
    };
    const client = new QueueHttpClient([]);
    const manager = new AuthManager({
      http: client,
      store: new MemoryStore(stored),
      now: clock.now,
      sleep: async () => undefined,
    });
    await manager.load();

    expect(await manager.getAccessToken(credentials)).toBe("cached");
    expect(client.requests).toHaveLength(0);
  });

  it("refreshes an expired token and keeps the old refresh token", async () => {
    const clock = createClock();
    const stored: StoredAuth = {
      accessToken: "old",
      refreshToken: "refresh-1",
      expiresAt: clock.now() - 1,
      scope: DRIVE_FILE_SCOPE,
      tokenType: "Bearer",
    };
    const client = new QueueHttpClient([
      {
        status: 200,
        text: tokenBody({ access_token: "fresh", refresh_token: undefined }),
      },
    ]);
    const store = new MemoryStore(stored);
    const manager = new AuthManager({
      http: client,
      store,
      now: clock.now,
      sleep: async () => undefined,
    });
    await manager.load();

    expect(await manager.getAccessToken(credentials)).toBe("fresh");
    expect(store.saved?.refreshToken).toBe("refresh-1");
    expect(client.requests[0]?.url).toBe(TOKEN_URL);
    expect(client.requests[0]?.body).toContain("grant_type=refresh_token");
    expect(client.requests[0]?.body).toContain("refresh_token=refresh-1");
  });

  it("requires reconnection on invalid_grant", async () => {
    const clock = createClock();
    const stored: StoredAuth = {
      accessToken: "old",
      refreshToken: "refresh-1",
      expiresAt: clock.now() - 1,
      scope: DRIVE_FILE_SCOPE,
      tokenType: "Bearer",
    };
    const client = new QueueHttpClient([
      { status: 400, text: JSON.stringify({ error: "invalid_grant" }) },
    ]);
    const manager = new AuthManager({
      http: client,
      store: new MemoryStore(stored),
      now: clock.now,
      sleep: async () => undefined,
    });
    await manager.load();

    await expect(manager.getAccessToken(credentials)).rejects.toMatchObject({
      code: "invalid_grant",
    });
  });

  it("does not call HTTP when no account is connected", async () => {
    const client = new QueueHttpClient([]);
    const manager = new AuthManager({
      http: client,
      store: new MemoryStore(null),
      sleep: async () => undefined,
    });
    await manager.load();

    await expect(manager.getAccessToken(credentials)).rejects.toMatchObject({
      code: "not_connected",
    });
  });
});

describe("AuthManager.disconnect", () => {
  it("clears local tokens and revokes the refresh token", async () => {
    const clock = createClock();
    const stored: StoredAuth = {
      accessToken: "at",
      refreshToken: "refresh-1",
      expiresAt: clock.now() + 60_000,
      scope: DRIVE_FILE_SCOPE,
      tokenType: "Bearer",
    };
    const client = new QueueHttpClient([{ status: 200, text: "" }]);
    const store = new MemoryStore(stored);
    const manager = new AuthManager({
      http: client,
      store,
      now: clock.now,
      sleep: async () => undefined,
    });
    await manager.load();

    await manager.disconnect();

    expect(store.saved).toBeNull();
    expect(manager.getStatus()).toBe("disconnected");
    expect(client.requests[0]?.url).toBe(REVOKE_URL);
    expect(client.requests[0]?.body).toBe("token=refresh-1");
  });

  it("still clears local tokens when revocation fails", async () => {
    const clock = createClock();
    const stored: StoredAuth = {
      accessToken: "at",
      refreshToken: "refresh-1",
      expiresAt: clock.now() + 60_000,
      scope: DRIVE_FILE_SCOPE,
      tokenType: "Bearer",
    };
    const client = new QueueHttpClient([]);
    const store = new MemoryStore(stored);
    const manager = new AuthManager({
      http: client,
      store,
      now: clock.now,
      sleep: async () => undefined,
    });
    await manager.load();

    await manager.disconnect();

    expect(store.saved).toBeNull();
    expect(manager.getStatus()).toBe("disconnected");
  });
});
