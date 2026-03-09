CREATE TYPE role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE plan AS ENUM ('free', 'starter', 'pro');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  email_verified_at timestamptz,
  is_suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique_idx ON users (email);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sessions_token_hash_unique_idx ON sessions (token_hash);
CREATE INDEX sessions_user_expires_idx ON sessions (user_id, expires_at);

CREATE TABLE email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX email_verification_tokens_hash_unique_idx ON email_verification_tokens (token_hash);
CREATE INDEX email_verification_tokens_user_idx ON email_verification_tokens (user_id);

CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX password_reset_tokens_hash_unique_idx ON password_reset_tokens (token_hash);
CREATE INDEX password_reset_tokens_user_idx ON password_reset_tokens (user_id);

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX organizations_slug_unique_idx ON organizations (slug);
CREATE INDEX organizations_owner_idx ON organizations (owner_user_id);

CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX memberships_org_user_unique_idx ON memberships (organization_id, user_id);
CREATE INDEX memberships_org_role_idx ON memberships (organization_id, role);
CREATE INDEX memberships_user_idx ON memberships (user_id);

CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role role NOT NULL,
  invited_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invitations_token_unique_idx ON invitations (token_hash);
CREATE INDEX invitations_org_email_idx ON invitations (organization_id, email);
CREATE INDEX invitations_expiry_idx ON invitations (expires_at);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text,
  plan plan NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX subscriptions_org_unique_idx ON subscriptions (organization_id);
CREATE UNIQUE INDEX subscriptions_customer_unique_idx ON subscriptions (stripe_customer_id);
CREATE UNIQUE INDEX subscriptions_subscription_unique_idx ON subscriptions (stripe_subscription_id);

CREATE TABLE entitlement_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan plan NOT NULL,
  max_members integer NOT NULL,
  feature_flags jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX entitlement_snapshots_org_created_idx ON entitlement_snapshots (organization_id, created_at);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_org_action_idx ON audit_logs (organization_id, action);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_user_id);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at);

CREATE TABLE admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  note text NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_notes_subject_idx ON admin_notes (subject_type, subject_id);
CREATE INDEX admin_notes_creator_idx ON admin_notes (created_by_user_id);
