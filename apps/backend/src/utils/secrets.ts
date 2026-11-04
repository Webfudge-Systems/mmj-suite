import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

/** Salted scrypt hash, stored as "scrypt$salt$hash". */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(pin, salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function checkPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(pin, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

/** PINs a thief would try first. */
export function weakPin(pin: string): string | null {
  if (!/^\d{4,6}$/.test(pin)) return "A PIN is 4 to 6 digits.";
  if (/^(\d)\1+$/.test(pin)) return "A PIN cannot be one digit repeated.";
  const ascending = "0123456789".includes(pin);
  const descending = "9876543210".includes(pin);
  if (ascending || descending) return "A PIN cannot be a run of digits like 1234.";
  return null;
}

/** A long random token for a paired tablet; only its SHA-256 is stored. */
export function newDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Six digits, shown once in the Back Office and typed on the tablet. */
export function pairingCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * A small in-memory limiter for the endpoints a stranger can reach (tablet
 * pairing and PIN sign-in). Resets when the server restarts, which is fine:
 * the per-account PIN lockout is stored in the database.
 */
export function rateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; until: number }>();
  return (key: string): boolean => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.until < now) {
      hits.set(key, { count: 1, until: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}
