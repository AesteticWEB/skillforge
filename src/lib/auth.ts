export type SessionPayload = {
  sub: string;
  login: string;
  role: "admin" | "user";
  iat: number;
};

const encoder = new TextEncoder();

const hasBuffer = typeof Buffer !== "undefined";

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
  payload: SessionPayload,
  secret: string,
): Promise<string> => {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
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
    if (!payload?.sub || !payload?.login || !payload?.role) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};
