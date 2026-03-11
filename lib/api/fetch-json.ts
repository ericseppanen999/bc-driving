import { logError } from "@/lib/utils/logger";

export async function fetchJson<T>(
  input: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 8000);

  try {
    const response = await fetch(input, {
      ...init,
      headers: {
        Accept: "application/json, text/html;q=0.9",
        ...init?.headers
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Upstream request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    logError("fetch_json_failed", { input, error: String(error) });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchText(
  input: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 8000);

  try {
    const response = await fetch(input, {
      ...init,
      headers: {
        Accept: "text/html, text/plain;q=0.9",
        ...init?.headers
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Upstream request failed: ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
