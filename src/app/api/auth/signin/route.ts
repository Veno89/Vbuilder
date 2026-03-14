import { NextResponse } from 'next/server';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';
import { authService } from '@/modules/auth/application/auth-container';
import { toRouteErrorResponse } from '@/modules/shared/presentation/route-error-response';

const sessionCookieName = 'vb_session';

export async function POST(request: Request): Promise<Response> {
  try {
    const rateLimit = await enforceRateLimit({
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
    return toRouteErrorResponse(error, {
      includeValidationError: true,
      authorizationStatus: 401,
      fallbackMessage: 'Failed to sign in.'
    });
  }
}
