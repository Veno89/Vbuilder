import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { invitationService } from '@/modules/invitations/application/invitation-container';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const result = await invitationService.accept(body);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to accept invitation.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
