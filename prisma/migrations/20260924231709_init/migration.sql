-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('CATALYST', 'MATERIAL', 'CONSUMABLE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "mana" INTEGER NOT NULL DEFAULT 0,
    "grails" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "wars_played" INTEGER NOT NULL DEFAULT 0,
    "spirit_origin" INTEGER NOT NULL DEFAULT 0,
    "total_summons" INTEGER NOT NULL DEFAULT 0,
    "last_free_summon_at" TIMESTAMP(3),
    "favorite_servant_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servant_classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "color" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "features" JSONB NOT NULL DEFAULT '[]',
    "modifiers" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servant_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servants" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL,
    "alignment" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT '',
    "origin" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "era" TEXT NOT NULL DEFAULT '',
    "strength" TEXT NOT NULL,
    "endurance" TEXT NOT NULL,
    "agility" TEXT NOT NULL,
    "mana" TEXT NOT NULL,
    "luck" TEXT NOT NULL,
    "np_rank" TEXT NOT NULL,
    "base_hp" INTEGER NOT NULL DEFAULT 1000,
    "base_mp" INTEGER NOT NULL DEFAULT 100,
    "traits" TEXT[],
    "summon_weight" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "image_url" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noble_phantasms" (
    "id" SERIAL NOT NULL,
    "servant_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '',
    "mana_cost" INTEGER NOT NULL DEFAULT 0,
    "target_type" TEXT NOT NULL DEFAULT 'single_enemy',
    "effects" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "noble_phantasms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_servants" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "servant_id" INTEGER NOT NULL,
    "bond_level" INTEGER NOT NULL DEFAULT 0,
    "bond_xp" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "battles" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "obtained_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_servants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📦',
    "rarity" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL DEFAULT '{}',
    "drop_weight" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_inventory" (
    "user_id" TEXT NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_inventory_pkey" PRIMARY KEY ("user_id","item_id")
);

-- CreateTable
CREATE TABLE "summon_pools" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "rate_modifiers" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "announced_at" TIMESTAMP(3),

    CONSTRAINT "summon_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summon_pool_servants" (
    "pool_id" INTEGER NOT NULL,
    "servant_id" INTEGER NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "weight_override" INTEGER,

    CONSTRAINT "summon_pool_servants_pkey" PRIMARY KEY ("pool_id","servant_id")
);

-- CreateTable
CREATE TABLE "summon_history" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "servant_id" INTEGER NOT NULL,
    "pool_id" INTEGER NOT NULL,
    "catalyst_item_id" INTEGER,
    "is_duplicate" BOOLEAN NOT NULL,
    "spirit_origin_gained" INTEGER NOT NULL DEFAULT 0,
    "dropped_item_id" INTEGER,
    "probability" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "summon_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_logs" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "servants_slug_key" ON "servants"("slug");

-- CreateIndex
CREATE INDEX "servants_class_id_idx" ON "servants"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "noble_phantasms_servant_id_name_key" ON "noble_phantasms"("servant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "player_servants_user_id_servant_id_key" ON "player_servants"("user_id", "servant_id");

-- CreateIndex
CREATE UNIQUE INDEX "items_slug_key" ON "items"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "summon_pools_slug_key" ON "summon_pools"("slug");

-- CreateIndex
CREATE INDEX "summon_pools_start_date_end_date_idx" ON "summon_pools"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "summon_history_user_id_created_at_idx" ON "summon_history"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "action_logs_action_created_at_idx" ON "action_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "action_logs_user_id_created_at_idx" ON "action_logs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_favorite_servant_id_fkey" FOREIGN KEY ("favorite_servant_id") REFERENCES "servants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servants" ADD CONSTRAINT "servants_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "servant_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noble_phantasms" ADD CONSTRAINT "noble_phantasms_servant_id_fkey" FOREIGN KEY ("servant_id") REFERENCES "servants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_servants" ADD CONSTRAINT "player_servants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_servants" ADD CONSTRAINT "player_servants_servant_id_fkey" FOREIGN KEY ("servant_id") REFERENCES "servants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_inventory" ADD CONSTRAINT "player_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_inventory" ADD CONSTRAINT "player_inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summon_pool_servants" ADD CONSTRAINT "summon_pool_servants_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "summon_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summon_pool_servants" ADD CONSTRAINT "summon_pool_servants_servant_id_fkey" FOREIGN KEY ("servant_id") REFERENCES "servants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summon_history" ADD CONSTRAINT "summon_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summon_history" ADD CONSTRAINT "summon_history_servant_id_fkey" FOREIGN KEY ("servant_id") REFERENCES "servants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summon_history" ADD CONSTRAINT "summon_history_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "summon_pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
