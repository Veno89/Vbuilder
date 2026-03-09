type Bucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, Bucket>();

export function enforceRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = buckets.get(input.key);

  if (!current || current.resetAtMs <= now) {
    buckets.set(input.key, { count: 1, resetAtMs: now + input.windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(input.windowMs / 1000) };
  }

  if (current.count >= input.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAtMs - now) / 1000)
    };
  }

  current.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: Math.ceil((current.resetAtMs - now) / 1000)
  };
}

export function rateLimitKeyFromRequest(request: Request, action: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for') ?? 'unknown';
  const ip = forwardedFor.split(',')[0]?.trim() || 'unknown';
  return `${action}:${ip}`;
}
