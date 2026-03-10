CREATE TABLE stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX stripe_webhook_events_event_id_unique_idx ON stripe_webhook_events (event_id);
CREATE INDEX stripe_webhook_events_processed_at_idx ON stripe_webhook_events (processed_at);
