import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { organizationService } from '@/modules/organizations/application/organization-container';
import { authContextService } from '@/modules/auth/application/auth-container';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const actor = await authContextService.requireAuthenticatedActor(request);
    const result = await organizationService.create({ ...body, actorUserId: actor.userId });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to create organization.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
