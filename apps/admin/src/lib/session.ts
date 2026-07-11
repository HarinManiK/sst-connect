import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "sst_admin_session";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sign(payload: string) {
  const secret = process.env.ADMIN_SESSION_SECRET!;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionValue() {
  const payload = String(Date.now());
  return `${payload}.${sign(payload)}`;
}

export function isValidSession(value: string | undefined): boolean {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const issuedAt = Number(payload);
  return Number.isFinite(issuedAt) && Date.now() - issuedAt < MAX_AGE_MS;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE_SECONDS = MAX_AGE_MS / 1000;
