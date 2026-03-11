export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

export interface RateLimiter {
  enforce(input: RateLimitInput): Promise<RateLimitDecision>;
}

type Bucket = {
  count: number;
  resetAtMs: number;
};

class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  async enforce(input: RateLimitInput): Promise<RateLimitDecision> {
    const now = Date.now();
    const current = this.buckets.get(input.key);

    if (!current || current.resetAtMs <= now) {
      this.buckets.set(input.key, { count: 1, resetAtMs: now + input.windowMs });
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
}

class RedisRestRateLimiter implements RateLimiter {
  constructor(
    private readonly redisUrl: string,
    private readonly redisToken: string,
    private readonly fallback: RateLimiter
  ) {}

  async enforce(input: RateLimitInput): Promise<RateLimitDecision> {
    const windowSeconds = Math.max(1, Math.ceil(input.windowMs / 1000));

    try {
      const count = await this.commandNumber(['INCR', input.key]);

      if (count === 1) {
        await this.commandNumber(['EXPIRE', input.key, String(windowSeconds)]);
      }

      const ttl = await this.commandNumber(['TTL', input.key]);
      const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;

      return {
        allowed: count <= input.limit,
        retryAfterSeconds
      };
    } catch (error) {
      console.warn('Redis rate limiter unavailable, falling back to in-memory limiter.', error);
      return this.fallback.enforce(input);
    }
  }

  private async commandNumber(command: string[]): Promise<number> {
    const response = await fetch(this.redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.redisToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command })
    });

    if (!response.ok) {
      throw new Error(`Redis REST command failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as { result?: unknown; error?: string };

    if (payload.error) {
      throw new Error(payload.error);
    }

    if (typeof payload.result !== 'number') {
      throw new Error('Redis REST response did not return a numeric result.');
    }

    return payload.result;
  }
}

function createRateLimiter(): RateLimiter {
  const fallback = new InMemoryRateLimiter();
  const redisUrl = process.env.RATE_LIMIT_REDIS_REST_URL;
  const redisToken = process.env.RATE_LIMIT_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return fallback;
  }

  return new RedisRestRateLimiter(redisUrl, redisToken, fallback);
}

const rateLimiter = createRateLimiter();

export async function enforceRateLimit(input: RateLimitInput): Promise<RateLimitDecision> {
  return rateLimiter.enforce(input);
}

export function rateLimitKeyFromRequest(request: Request, action: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for') ?? 'unknown';
  const ip = forwardedFor.split(',')[0]?.trim() || 'unknown';
  return `${action}:${ip}`;
}
