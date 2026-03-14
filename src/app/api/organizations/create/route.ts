import { NextResponse } from 'next/server';
import { organizationService } from '@/modules/organizations/application/organization-container';
import { authContextService } from '@/modules/auth/application/auth-container';
import { toRouteErrorResponse } from '@/modules/shared/presentation/route-error-response';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const actor = await authContextService.requireAuthenticatedActor(request);
    const result = await organizationService.create({ ...body, actorUserId: actor.userId });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error, {
      includeValidationError: true,
      includeNotFoundError: true,
      fallbackMessage: 'Failed to create organization.'
    });
  }
}
