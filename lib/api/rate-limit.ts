const requests = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const entry = requests.get(key);

  if (!entry || entry.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= limit) {
    return true;
  }

  entry.count += 1;
  return false;
}
