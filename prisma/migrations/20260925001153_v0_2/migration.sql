-- CreateEnum
CREATE TYPE "BondRewardType" AS ENUM ('COINS', 'SPIRIT_ORIGIN', 'ITEM', 'TITLE');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('IN_PROGRESS', 'CLAIMED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('COINS', 'SPIRIT_ORIGIN');

-- AlterTable
ALTER TABLE "summon_history" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'free';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "equipped_title" TEXT;

-- CreateTable
CREATE TABLE "bond_rewards" (
    "id" SERIAL NOT NULL,
    "servant_id" INTEGER,
    "level" INTEGER NOT NULL,
    "type" "BondRewardType" NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "item_id" INTEGER,
    "title" TEXT,

    CONSTRAINT "bond_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_titles" (
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "obtained_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_titles_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📜',
    "description" TEXT NOT NULL DEFAULT '',
    "difficulty" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "min_level" INTEGER NOT NULL DEFAULT 1,
    "stat_weights" JSONB NOT NULL DEFAULT '{}',
    "class_bonus" JSONB NOT NULL DEFAULT '{}',
    "trait_bonus" JSONB NOT NULL DEFAULT '{}',
    "rewards" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_missions" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "mission_id" INTEGER NOT NULL,
    "player_servant_id" INTEGER NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "success_chance" DOUBLE PRECISION NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "outcome" TEXT,
    "result" JSONB,
    "claimed_at" TIMESTAMP(3),

    CONSTRAINT "player_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_offers" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "item_id" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "weekly_limit" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shop_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_purchases" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "offer_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_price" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bond_rewards_level_idx" ON "bond_rewards"("level");

-- CreateIndex
CREATE UNIQUE INDEX "missions_slug_key" ON "missions"("slug");

-- CreateIndex
CREATE INDEX "player_missions_user_id_status_idx" ON "player_missions"("user_id", "status");

-- CreateIndex
CREATE INDEX "player_missions_player_servant_id_status_idx" ON "player_missions"("player_servant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shop_offers_slug_key" ON "shop_offers"("slug");

-- CreateIndex
CREATE INDEX "shop_purchases_user_id_offer_id_created_at_idx" ON "shop_purchases"("user_id", "offer_id", "created_at");

-- AddForeignKey
ALTER TABLE "bond_rewards" ADD CONSTRAINT "bond_rewards_servant_id_fkey" FOREIGN KEY ("servant_id") REFERENCES "servants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bond_rewards" ADD CONSTRAINT "bond_rewards_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_titles" ADD CONSTRAINT "player_titles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_missions" ADD CONSTRAINT "player_missions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_missions" ADD CONSTRAINT "player_missions_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_missions" ADD CONSTRAINT "player_missions_player_servant_id_fkey" FOREIGN KEY ("player_servant_id") REFERENCES "player_servants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_offers" ADD CONSTRAINT "shop_offers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchases" ADD CONSTRAINT "shop_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchases" ADD CONSTRAINT "shop_purchases_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "shop_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
