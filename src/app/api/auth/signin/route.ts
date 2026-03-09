import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';
import { authService } from '@/modules/auth/application/auth-container';

const sessionCookieName = 'vb_session';

export async function POST(request: Request): Promise<Response> {

  const rateLimit = enforceRateLimit({
    key: rateLimitKeyFromRequest(request, 'auth:signin'),
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
    const result = await authService.signIn(body);

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set(sessionCookieName, result.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      expires: result.expiresAt,
      path: '/'
    });
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to sign in.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
