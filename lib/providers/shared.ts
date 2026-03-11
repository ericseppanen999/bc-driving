import { BBox, ProviderHealth } from "@/lib/types/domain";
import { memoryCache } from "@/lib/cache/memory-cache";

export interface ProviderAdapter<T> {
  name: string;
  healthcheck(): Promise<ProviderHealth>;
  fetchAll(): Promise<T[]>;
  fetchByBbox?(bbox: BBox): Promise<T[]>;
  fetchById?(id: string): Promise<T | null>;
}

export interface ProviderState {
  lastSuccessAt?: string;
  lastFailureAt?: string;
  errorCount: number;
}

export const providerState = new Map<string, ProviderState>();

export function recordProviderSuccess(provider: string) {
  const current = providerState.get(provider) ?? { errorCount: 0 };
  providerState.set(provider, {
    ...current,
    lastSuccessAt: new Date().toISOString()
  });
}

export function recordProviderFailure(provider: string) {
  const current = providerState.get(provider) ?? { errorCount: 0 };
  providerState.set(provider, {
    ...current,
    errorCount: current.errorCount + 1,
    lastFailureAt: new Date().toISOString()
  });
}

export function buildHealth(
  provider: string,
  message: string,
  options?: { cacheKey?: string; down?: boolean }
): ProviderHealth {
  const state = providerState.get(provider);
  const cached = options?.cacheKey ? memoryCache.getStale(options.cacheKey) : null;
  const hasCache = Boolean(cached?.value);

  return {
    provider,
    status: options?.down ? (hasCache ? "degraded" : "down") : hasCache ? "ok" : "degraded",
    message,
    checkedAt: new Date().toISOString(),
    lastSuccessAt: state?.lastSuccessAt,
    lastFailureAt: state?.lastFailureAt,
    stale: cached?.meta.isStale ?? false,
    cacheAgeSeconds: cached?.meta.ageSeconds
  };
}
