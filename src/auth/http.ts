export interface HttpRequest {
  url: string;
  method: "GET" | "POST";
  body?: string;
  contentType?: string;
  headers?: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  text: string;
}

/**
 * Minimal transport interface. Runtime code uses the Obsidian `requestUrl`
 * implementation; tests use an in-memory queue.
 */
export interface HttpClient {
  request(request: HttpRequest): Promise<HttpResponse>;
}
