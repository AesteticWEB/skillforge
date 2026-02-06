export type SessionPayload = {
  sub: string;
  login: string;
  role: "admin" | "user";
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti: string;
};

const encoder = new TextEncoder();

const hasBuffer = typeof Buffer !== "undefined";

export const SESSION_COOKIE = "sf_session";

export const SESSION_ISSUER = "skillforge";
export const SESSION_AUDIENCE = "skillforge-app";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_SKEW_SECONDS = 60;

export const getSessionSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is required in production");
    }
    return "dev-secret";
  }
  if (secret.length < 32 && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return secret;
};

const toBase64Url = (bytes: Uint8Array): string => {
  const base64 = hasBuffer
    ? Buffer.from(bytes).toString("base64")
    : btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (base64Url: string): Uint8Array => {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "===".slice((base64.length + 3) % 4);
  if (hasBuffer) {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const safeEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
};

const sign = async (data: string, secret: string): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
};

export const createSessionToken = async (
  payload: Omit<SessionPayload, "iat" | "exp" | "iss" | "aud" | "jti">,
  secret: string,
): Promise<string> => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + SESSION_TTL_SECONDS,
    iss: SESSION_ISSUER,
    aud: SESSION_AUDIENCE,
    jti: crypto.randomUUID(),
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(fullPayload)));
  const signature = toBase64Url(await sign(body, secret));
  return `${body}.${signature}`;
};

export const verifySessionToken = async (
  token: string,
  secret: string,
): Promise<SessionPayload | null> => {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }
  const expected = await sign(body, secret);
  const actual = fromBase64Url(signature);
  if (!safeEqual(expected, actual)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body)),
    ) as SessionPayload;
    if (
      !payload?.sub ||
      !payload?.login ||
      !payload?.role ||
      !payload?.iat ||
      !payload?.exp ||
      !payload?.iss ||
      !payload?.aud ||
      !payload?.jti
    ) {
      return null;
    }
    if (payload.iss !== SESSION_ISSUER || payload.aud !== SESSION_AUDIENCE) {
      return null;
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.iat > nowSeconds + SESSION_SKEW_SECONDS) {
      return null;
    }
    if (payload.exp < nowSeconds - SESSION_SKEW_SECONDS) {
      return null;
    }
    if (payload.exp - payload.iat > SESSION_TTL_SECONDS + SESSION_SKEW_SECONDS) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};
