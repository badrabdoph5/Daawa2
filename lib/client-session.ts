import { getClientSessionSecret } from "./auth-config";

export const CLIENT_SESSION_COOKIE = "bd_client_session";
export const CLIENT_SESSION_MAX_AGE = 60 * 60 * 12;

type ClientSessionPayload = {
  code: string;
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

function getSecret() {
  const secret = getClientSessionSecret();
  return secret.length >= 16 ? secret : "";
}

async function getSigningKey() {
  const secret = getSecret();
  if (!secret) return null;
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function sign(value: string) {
  const key = await getSigningKey();
  if (!key) throw new Error("CLIENT_SESSION_SECRET must be at least 16 characters.");
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifySignature(value: string, signature: string) {
  try {
    const key = await getSigningKey();
    if (!key) return false;
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

export async function createClientSessionCookie(code: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encodeJson({
    code,
    iat: now,
    exp: now + CLIENT_SESSION_MAX_AGE,
    nonce: randomNonce(),
  } satisfies ClientSessionPayload);
  const signature = await sign(payload);
  return `v1.${payload}.${signature}`;
}

export async function verifyClientSessionCookie(value: string | undefined | null, code: string) {
  if (!value || !code) return false;

  const [version, payload, signature] = value.split(".");
  if (version !== "v1" || !payload || !signature) return false;

  const isValidSignature = await verifySignature(payload, signature);
  if (!isValidSignature) return false;

  try {
    const session = decodeJson<ClientSessionPayload>(payload);
    const now = Math.floor(Date.now() / 1000);
    return Boolean(session.code === code && session.exp > now && session.iat <= now);
  } catch {
    return false;
  }
}
