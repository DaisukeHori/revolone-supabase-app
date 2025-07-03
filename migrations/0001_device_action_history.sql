
CREATE TABLE "device_action_history" (
  "id" serial PRIMARY KEY,
  "serial_number" text NOT NULL,
  "stripe_customer_id" text NOT NULL,
  "action_type" text NOT NULL,
  "action_date" timestamp DEFAULT now() NOT NULL,
  "lock_until" timestamp NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX idx_device_action_history_serial_customer ON device_action_history(serial_number, stripe_customer_id);
CREATE INDEX idx_device_action_history_lock_until ON device_action_history(lock_until);
