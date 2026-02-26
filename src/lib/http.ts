export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchWithTimeout(
  input: string | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = 8000, signal, ...init } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortFromCaller, { once: true });
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    if (signal) {
      signal.removeEventListener("abort", abortFromCaller);
    }
    clearTimeout(timeout);
  }
}

export async function fetchJsonWithTimeout<T>(
  input: string | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const res = await fetchWithTimeout(input, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchTextWithTimeout(
  input: string | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<string> {
  const res = await fetchWithTimeout(input, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}
