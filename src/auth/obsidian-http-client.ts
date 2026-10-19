import { requestUrl } from "obsidian";
import { HttpClient, HttpRequest, HttpResponse } from "./http";

/**
 * `requestUrl` bypasses CORS and works on desktop and mobile, unlike `fetch`.
 * `throw: false` lets the auth layer inspect Google error payloads itself.
 */
export class ObsidianHttpClient implements HttpClient {
  async request(request: HttpRequest): Promise<HttpResponse> {
    const response = await requestUrl({
      url: request.url,
      method: request.method,
      contentType: request.contentType,
      body: request.body,
      headers: request.headers,
      throw: false,
    });

    return { status: response.status, text: response.text };
  }
}
