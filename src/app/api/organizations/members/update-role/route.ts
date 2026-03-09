import { NextResponse } from 'next/server';
import { membershipService } from '@/modules/memberships/application/membership-container';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    await membershipService.updateRole(body);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update membership role.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
