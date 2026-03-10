import { count } from 'drizzle-orm';
import type { DatabaseClient } from '@/server/db/client';
import { organizations, subscriptions, users } from '@/server/db/schema';

export class AdminRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getOverview(): Promise<{
    totalUsers: number;
    totalOrganizations: number;
    totalSubscriptions: number;
  }> {
    const [userCount, organizationCount, subscriptionCount] = await Promise.all([
      this.db.select({ value: count() }).from(users),
      this.db.select({ value: count() }).from(organizations),
      this.db.select({ value: count() }).from(subscriptions)
    ]);

    return {
      totalUsers: userCount[0]?.value ?? 0,
      totalOrganizations: organizationCount[0]?.value ?? 0,
      totalSubscriptions: subscriptionCount[0]?.value ?? 0
    };
  }
}
