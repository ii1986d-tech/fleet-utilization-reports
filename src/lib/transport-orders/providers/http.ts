export type FetchLike = typeof fetch;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs: number; fetchImpl?: FetchLike },
): Promise<Response> {
  const fetchImpl = init.fetchImpl ?? fetch;
  const timeoutMs = init.timeoutMs;
  const rest: RequestInit = {
    method: init.method,
    headers: init.headers,
    body: init.body,
    cache: init.cache,
    credentials: init.credentials,
    integrity: init.integrity,
    keepalive: init.keepalive,
    mode: init.mode,
    redirect: init.redirect,
    referrer: init.referrer,
    referrerPolicy: init.referrerPolicy,
    window: init.window,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...rest, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Provider request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function classifyHttpStatus(status: number): "retryable" | "non_retryable" {
  if (status === 408 || status === 429 || status >= 500) return "retryable";
  return "non_retryable";
}
