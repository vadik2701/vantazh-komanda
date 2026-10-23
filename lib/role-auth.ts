import { env } from "cloudflare:workers";

export type AppRole = "manager" | "worker";

const COOKIE_NAME = "vantazh_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function bytes(value: string) {
  return new TextEncoder().encode(value);
}

function base64Url(value: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function signature(payload: string) {
  const secret = env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const key = await crypto.subtle.importKey("raw", bytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, bytes(payload)));
}

function secureEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function verifyPin(role: AppRole, pin: string) {
  const expected = role === "manager" ? env.MANAGER_PIN : env.CREW_PIN;
  return Boolean(expected) && secureEqual(pin, expected ?? "");
}

export async function createSession(role: AppRole) {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${role}.${expiresAt}`;
  return `${payload}.${await signature(payload)}`;
}

export async function getSessionRole(request: Request): Promise<AppRole | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!token) return null;
  const [role, expiresAt, providedSignature] = token.split(".");
  if ((role !== "manager" && role !== "worker") || !expiresAt || !providedSignature) return null;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return null;
  const expectedSignature = await signature(`${role}.${expiresAt}`);
  return secureEqual(providedSignature, expectedSignature) ? role : null;
}

export function sessionCookie(token: string) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
