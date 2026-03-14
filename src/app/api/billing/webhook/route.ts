import { NextResponse } from 'next/server';
import { billingService } from '@/modules/billing/application/billing-container';
import { toRouteErrorResponse } from '@/modules/shared/presentation/route-error-response';

export async function POST(request: Request): Promise<Response> {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    const result = await billingService.handleWebhook(rawBody, signature);

    return NextResponse.json({ received: true, processed: result.processed }, { status: 200 });
  } catch (error) {
    return toRouteErrorResponse(error, {
      authorizationStatus: 400,
      fallbackMessage: 'Failed to process billing webhook.'
    });
  }
}
