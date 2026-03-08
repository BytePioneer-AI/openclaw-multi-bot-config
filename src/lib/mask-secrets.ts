const SECRET_KEYS = ["clientsecret", "appsecret", "corpsecret", "token", "encodingaeskey", "apikey"];

function shouldMask(key: string): boolean {
  const normalized = key.toLowerCase();
  return SECRET_KEYS.includes(normalized) || normalized.includes("secret") || normalized.includes("token") || normalized.endsWith("key");
}

function maskString(value: string): string {
  if (value.length <= 4) {
    return "*".repeat(Math.max(1, value.length));
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function maskSecrets<T>(value: T, currentKey?: string): T {
  if (Array.isArray(value)) {
    return value.map((item) => maskSecrets(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
      if (typeof nestedValue === "string" && shouldMask(key)) {
        return [key, maskString(nestedValue)];
      }

      return [key, maskSecrets(nestedValue, key)];
    });
    return Object.fromEntries(entries) as T;
  }

  if (typeof value === "string" && currentKey && shouldMask(currentKey)) {
    return maskString(value) as T;
  }

  return value;
}
