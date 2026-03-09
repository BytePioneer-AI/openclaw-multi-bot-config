const SECRET_KEYS = ["clientsecret", "appsecret", "corpsecret", "token", "encodingaeskey", "apikey"];
function shouldMask(key) {
    const normalized = key.toLowerCase();
    return SECRET_KEYS.includes(normalized) || normalized.includes("secret") || normalized.includes("token") || normalized.endsWith("key");
}
function maskString(value) {
    if (value.length <= 4) {
        return "*".repeat(Math.max(1, value.length));
    }
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
}
export function maskSecrets(value, currentKey) {
    if (Array.isArray(value)) {
        return value.map((item) => maskSecrets(item));
    }
    if (value && typeof value === "object") {
        const entries = Object.entries(value).map(([key, nestedValue]) => {
            if (typeof nestedValue === "string" && shouldMask(key)) {
                return [key, maskString(nestedValue)];
            }
            return [key, maskSecrets(nestedValue, key)];
        });
        return Object.fromEntries(entries);
    }
    if (typeof value === "string" && currentKey && shouldMask(currentKey)) {
        return maskString(value);
    }
    return value;
}
