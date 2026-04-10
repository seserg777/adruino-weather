import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";
import { type NextRequest, NextResponse } from "next/server";

const hasRedis =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (!hasRedis) {
    return null;
  }
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "weather-api",
    });
  }
  return ratelimit;
}

export const config = {
  matcher: "/api/:path*",
};

export default async function middleware(request: NextRequest) {
  const rl = getRatelimit();
  if (!rl) {
    return NextResponse.next();
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  const { success, limit, reset, remaining } = await rl.limit(ip);

  if (!success) {
    const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    const res = NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
    res.headers.set("Retry-After", String(retryAfterSec));
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(limit));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  return res;
}
