export function sanitizeText(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/[<>]/g, "").trim() || undefined;
}

export function sanitizeUrl(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}
