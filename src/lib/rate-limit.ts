import { NextResponse } from "next/server";

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp || "unknown";
};

export const rateLimit = (
  request: Request,
  keyPrefix: string,
  options: RateLimitOptions,
): { ok: true } | { ok: false; response: NextResponse } => {
  const ip = getClientIp(request);
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (buckets.size > 10_000) {
      for (const [keyEntry, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
          buckets.delete(keyEntry);
        }
      }
    }
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true };
  }
  if (current.count >= options.max) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        },
      ),
    };
  }
  current.count += 1;
  return { ok: true };
};
