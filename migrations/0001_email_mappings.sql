
CREATE TABLE IF NOT EXISTS "email_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"original_email" text NOT NULL,
	"current_email" text NOT NULL,
	"changed_by" integer NOT NULL,
	"change_reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "email_mappings" ADD CONSTRAINT "email_mappings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "email_mappings" ADD CONSTRAINT "email_mappings_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- インデックスを作成してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS "idx_email_mappings_store_id" ON "email_mappings" ("store_id");
CREATE INDEX IF NOT EXISTS "idx_email_mappings_stripe_customer_id" ON "email_mappings" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "idx_email_mappings_current_email" ON "email_mappings" ("current_email");
CREATE INDEX IF NOT EXISTS "idx_email_mappings_is_active" ON "email_mappings" ("is_active");

-- 複合インデックス（アクティブなマッピングを効率的に検索）
CREATE INDEX IF NOT EXISTS "idx_email_mappings_store_active" ON "email_mappings" ("store_id", "is_active");
