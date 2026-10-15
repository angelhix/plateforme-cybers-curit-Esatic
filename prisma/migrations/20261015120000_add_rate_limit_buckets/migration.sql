CREATE TABLE "rate_limit_buckets" (
    "key" VARCHAR(64) NOT NULL,
    "count" INTEGER NOT NULL,
    "window_started_at" TIMESTAMPTZ(3) NOT NULL,
    "blocked_until" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "rate_limit_buckets_updated_at_idx" ON "rate_limit_buckets"("updated_at");