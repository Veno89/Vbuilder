import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['owner', 'admin', 'member', 'viewer']);
export const planEnum = pgEnum('plan', ['free', 'starter', 'pro']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    isSuspended: boolean('is_suspended').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    emailUniqueIdx: uniqueIndex('users_email_unique_idx').on(table.email)
  })
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tokenHashUniqueIdx: uniqueIndex('sessions_token_hash_unique_idx').on(table.tokenHash),
    userExpiresIdx: index('sessions_user_expires_idx').on(table.userId, table.expiresAt)
  })
);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tokenHashUniqueIdx: uniqueIndex('email_verification_tokens_hash_unique_idx').on(table.tokenHash),
    userIdx: index('email_verification_tokens_user_idx').on(table.userId)
  })
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tokenHashUniqueIdx: uniqueIndex('password_reset_tokens_hash_unique_idx').on(table.tokenHash),
    userIdx: index('password_reset_tokens_user_idx').on(table.userId)
  })
);

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex('organizations_slug_unique_idx').on(table.slug),
    ownerIdx: index('organizations_owner_idx').on(table.ownerUserId)
  })
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    orgUserUniqueIdx: uniqueIndex('memberships_org_user_unique_idx').on(
      table.organizationId,
      table.userId
    ),
    orgRoleIdx: index('memberships_org_role_idx').on(table.organizationId, table.role),
    userIdx: index('memberships_user_idx').on(table.userId)
  })
);

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: roleEnum('role').notNull(),
    invitedByUserId: uuid('invited_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    declinedAt: timestamp('declined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tokenUniqueIdx: uniqueIndex('invitations_token_unique_idx').on(table.tokenHash),
    orgEmailIdx: index('invitations_org_email_idx').on(table.organizationId, table.email),
    expiryIdx: index('invitations_expiry_idx').on(table.expiresAt)
  })
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripeSubscriptionId: text('stripe_subscription_id'),
    plan: planEnum('plan').notNull().default('free'),
    status: text('status').notNull().default('inactive'),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    orgUniqueIdx: uniqueIndex('subscriptions_org_unique_idx').on(table.organizationId),
    stripeCustomerUniqueIdx: uniqueIndex('subscriptions_customer_unique_idx').on(
      table.stripeCustomerId
    ),
    stripeSubscriptionUniqueIdx: uniqueIndex('subscriptions_subscription_unique_idx').on(
      table.stripeSubscriptionId
    )
  })
);

export const entitlementSnapshots = pgTable(
  'entitlement_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    plan: planEnum('plan').notNull(),
    maxMembers: integer('max_members').notNull(),
    featureFlags: jsonb('feature_flags').$type<Record<string, boolean>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    orgCreatedIdx: index('entitlement_snapshots_org_created_idx').on(
      table.organizationId,
      table.createdAt
    )
  })
);

export const stripeWebhookEvents = pgTable(
  'stripe_webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: text('event_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    eventIdUniqueIdx: uniqueIndex('stripe_webhook_events_event_id_unique_idx').on(table.eventId),
    processedAtIdx: index('stripe_webhook_events_processed_at_idx').on(table.processedAt)
  })
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null'
    }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    orgActionIdx: index('audit_logs_org_action_idx').on(table.organizationId, table.action),
    actorIdx: index('audit_logs_actor_idx').on(table.actorUserId),
    createdIdx: index('audit_logs_created_idx').on(table.createdAt)
  })
);

export const adminNotes = pgTable(
  'admin_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    subjectType: text('subject_type').notNull(),
    subjectId: text('subject_id').notNull(),
    note: text('note').notNull(),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    subjectIdx: index('admin_notes_subject_idx').on(table.subjectType, table.subjectId),
    creatorIdx: index('admin_notes_creator_idx').on(table.createdByUserId)
  })
);
