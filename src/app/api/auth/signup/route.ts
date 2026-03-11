import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';
import { authService } from '@/modules/auth/application/auth-container';

export async function POST(request: Request): Promise<Response> {

  const rateLimit = await enforceRateLimit({
    key: rateLimitKeyFromRequest(request, 'auth:signup'),
    limit: 10,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please retry later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }
  try {
    const body = await request.json();
    const result = await authService.signUp(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to sign up.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
