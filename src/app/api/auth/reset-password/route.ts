import { NextResponse } from 'next/server';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';
import { passwordResetService } from '@/modules/auth/application/auth-container';
import { resetPasswordSchema } from '@/modules/auth/schemas/auth.schemas';
import { toRouteErrorResponse } from '@/modules/shared/presentation/route-error-response';

export async function POST(request: Request): Promise<Response> {
  try {
    const rateLimit = await enforceRateLimit({
      key: rateLimitKeyFromRequest(request, 'auth:reset-password'),
      limit: 10,
      windowMs: 60_000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please retry later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }
    const body = resetPasswordSchema.parse(await request.json());
    await passwordResetService.resetPassword({ token: body.token, newPassword: body.newPassword });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return toRouteErrorResponse(error, {
      includeValidationError: true,
      fallbackMessage: 'Failed to reset password.'
    });
  }
}
