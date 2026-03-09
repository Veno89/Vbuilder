import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { invitationService, issueInvitationToken } from '@/modules/invitations/application/invitation-container';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const token = issueInvitationToken();

    await invitationService.send({
      ...body,
      token,
      plan: body.plan ?? 'free',
      currentMemberCount: body.currentMemberCount ?? 1
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to send invitation.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
