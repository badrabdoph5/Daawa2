import { getAdminSessionSecret } from "./auth-config";

export const ADMIN_SESSION_COOKIE = "bd_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;

type AdminSessionPayload = {
  sub: string;
  iat: number;
  exp: number;
  nonce: string;
};

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodeJson(value: unknown) {
  return bytesToBase64Url(encoder.encode(JSON.stringify(value)));
}

function decodeJson<T>(value: string) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;
}

async function getSigningKey() {
  return crypto.subtle.importKey("raw", encoder.encode(getAdminSessionSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function sign(value: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifySignature(value: string, signature: string) {
  try {
    const key = await getSigningKey();
    return crypto.subtle.verify("HMAC", key, base64UrlToBytes(signature), encoder.encode(value));
  } catch {
    return false;
  }
}

function randomNonce() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function createAdminSessionCookie(username: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encodeJson({
    sub: username,
    iat: now,
    exp: now + ADMIN_SESSION_MAX_AGE,
    nonce: randomNonce(),
  } satisfies AdminSessionPayload);
  const signature = await sign(payload);
  return `v1.${payload}.${signature}`;
}

export async function verifyAdminSessionCookie(value?: string | null) {
  if (!value) return false;

  const [version, payload, signature] = value.split(".");
  if (version !== "v1" || !payload || !signature) return false;

  const isValidSignature = await verifySignature(payload, signature);
  if (!isValidSignature) return false;

  try {
    const session = decodeJson<AdminSessionPayload>(payload);
    const now = Math.floor(Date.now() / 1000);
    return Boolean(session.sub && session.exp > now && session.iat <= now);
  } catch {
    return false;
  }
}
