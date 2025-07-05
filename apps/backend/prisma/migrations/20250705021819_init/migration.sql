-- CreateTable
CREATE TABLE "listings" (
    "id" SERIAL NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "size_ping" DOUBLE PRECISION NOT NULL,
    "house_type" TEXT,
    "room_type" TEXT,
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "description" TEXT,
    "image_urls" TEXT[],
    "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "floor" INTEGER,
    "total_floor" INTEGER,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT '591',
    "url" TEXT,
    "floor_info" TEXT,
    "parking" TEXT,
    "room_layout" TEXT,
    "size_detail" TEXT,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commute_times" (
    "id" SERIAL NOT NULL,
    "origin_id" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "commute_time" INTEGER NOT NULL,
    "commute_distance" INTEGER,
    "transit_mode" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commute_times_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "listings_city_district_idx" ON "listings"("city", "district");

-- CreateIndex
CREATE INDEX "listings_price_idx" ON "listings"("price");

-- CreateIndex
CREATE INDEX "listings_is_active_idx" ON "listings"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "listings_source_id_source_key" ON "listings"("source_id", "source");

-- CreateIndex
CREATE INDEX "commute_times_commute_time_idx" ON "commute_times"("commute_time");

-- CreateIndex
CREATE UNIQUE INDEX "commute_times_origin_id_destination_transit_mode_key" ON "commute_times"("origin_id", "destination", "transit_mode");

-- CreateIndex
CREATE INDEX "commute_cache_destination_hash_idx" ON "commute_cache"("destination_hash");

-- CreateIndex
CREATE INDEX "commute_cache_duration_minutes_idx" ON "commute_cache"("duration_minutes");

-- CreateIndex
CREATE INDEX "commute_cache_destination_hash_duration_minutes_idx" ON "commute_cache"("destination_hash", "duration_minutes");

-- CreateIndex
CREATE UNIQUE INDEX "commute_cache_listing_id_destination_hash_key" ON "commute_cache"("listing_id", "destination_hash");

-- AddForeignKey
ALTER TABLE "commute_times" ADD CONSTRAINT "commute_times_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commute_cache" ADD CONSTRAINT "commute_cache_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
