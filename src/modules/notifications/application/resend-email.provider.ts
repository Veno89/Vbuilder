import type { TransactionalEmailInput, TransactionalEmailProvider } from './notification.service';

export class ResendEmailProvider implements TransactionalEmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
    private readonly apiBaseUrl = 'https://api.resend.com'
  ) {}

  async sendEmail(input: TransactionalEmailInput): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [input.to],
        subject: input.subject,
        html: input.html
      })
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`Resend API request failed (${response.status}): ${responseBody}`);
    }
  }
}
