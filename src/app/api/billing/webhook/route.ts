import { NextResponse } from 'next/server';
import { billingService } from '@/modules/billing/application/billing-container';

export async function POST(request: Request): Promise<Response> {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    const result = await billingService.handleWebhook(rawBody, signature);

    return NextResponse.json({ received: true, processed: result.processed }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process billing webhook.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
