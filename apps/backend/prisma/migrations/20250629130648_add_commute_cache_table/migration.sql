-- CreateTable
CREATE TABLE "commute_cache" (
    "id" SERIAL NOT NULL,
    "destination_hash" TEXT NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "distance_km" DOUBLE PRECISION,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commute_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commute_cache_destination_hash_idx" ON "commute_cache"("destination_hash");

-- CreateIndex
CREATE INDEX "commute_cache_duration_minutes_idx" ON "commute_cache"("duration_minutes");

-- CreateIndex
CREATE INDEX "commute_cache_destination_hash_duration_minutes_idx" ON "commute_cache"("destination_hash", "duration_minutes");

-- CreateIndex
CREATE UNIQUE INDEX "commute_cache_listing_id_destination_hash_key" ON "commute_cache"("listing_id", "destination_hash");

-- AddForeignKey
ALTER TABLE "commute_cache" ADD CONSTRAINT "commute_cache_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
