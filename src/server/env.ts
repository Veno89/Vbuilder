import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email().default('no-reply@example.com'),
  RESEND_API_BASE_URL: z.string().url().default('https://api.resend.com'),
  NOTIFICATION_INBOX_ENABLED: z.coerce.boolean().default(false),
  DEV_INBOX_TOKEN: z.string().min(8).default('dev-inbox-token'),
  APP_URL: z.string().url(),
  PLATFORM_ADMIN_EMAILS: z.string().optional().default(''),
  RATE_LIMIT_REDIS_REST_URL: z.string().url().optional(),
  RATE_LIMIT_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
