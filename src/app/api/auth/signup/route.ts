import { NextResponse } from 'next/server';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';
import { authService } from '@/modules/auth/application/auth-container';
import { toRouteErrorResponse } from '@/modules/shared/presentation/route-error-response';

export async function POST(request: Request): Promise<Response> {
  try {
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
    const body = await request.json();
    const result = await authService.signUp(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error, {
      includeValidationError: true,
      authorizationStatus: 409,
      fallbackMessage: 'Failed to sign up.'
    });
  }
}
