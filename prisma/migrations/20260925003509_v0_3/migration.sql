-- CreateEnum
CREATE TYPE "WarStatus" AS ENUM ('REGISTRATION', 'PREPARATION', 'ACTIVE', 'FINISHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "grail_wars" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WarStatus" NOT NULL DEFAULT 'REGISTRATION',
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "min_players" INTEGER NOT NULL DEFAULT 2,
    "max_players" INTEGER NOT NULL DEFAULT 8,
    "map_slug" TEXT NOT NULL DEFAULT 'fuyuki',
    "registration_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registration_end" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "current_day" INTEGER NOT NULL DEFAULT 0,
    "current_phase" TEXT NOT NULL DEFAULT 'day',
    "next_day_at" TIMESTAMP(3),
    "winner_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grail_wars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "war_locations" (
    "id" SERIAL NOT NULL,
    "war_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📍',
    "description" TEXT NOT NULL DEFAULT '',
    "danger_level" INTEGER NOT NULL DEFAULT 1,
    "connections" TEXT[],
    "effects" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "war_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "war_participants" (
    "id" SERIAL NOT NULL,
    "war_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "servant_id" INTEGER,
    "current_hp" INTEGER NOT NULL DEFAULT 0,
    "max_hp" INTEGER NOT NULL DEFAULT 0,
    "current_mp" INTEGER NOT NULL DEFAULT 0,
    "max_mp" INTEGER NOT NULL DEFAULT 0,
    "command_spells" INTEGER NOT NULL DEFAULT 3,
    "location_id" INTEGER,
    "actions_remaining" INTEGER NOT NULL DEFAULT 0,
    "alive" BOOLEAN NOT NULL DEFAULT true,
    "identity_revealed" BOOLEAN NOT NULL DEFAULT false,
    "hidden_on_day" INTEGER,
    "training_stacks" INTEGER NOT NULL DEFAULT 0,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "damage_dealt" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "war_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_intel" (
    "id" SERIAL NOT NULL,
    "war_id" INTEGER NOT NULL,
    "observer_id" INTEGER NOT NULL,
    "target_id" INTEGER NOT NULL,
    "information_level" INTEGER NOT NULL DEFAULT 0,
    "last_seen_location_id" INTEGER,
    "last_seen_day" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_intel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "war_events" (
    "id" SERIAL NOT NULL,
    "war_id" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "participant_id" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "announced_at" TIMESTAMP(3),

    CONSTRAINT "war_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grail_wars_guild_id_status_idx" ON "grail_wars"("guild_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "war_locations_war_id_slug_key" ON "war_locations"("war_id", "slug");

-- CreateIndex
CREATE INDEX "war_participants_war_id_location_id_idx" ON "war_participants"("war_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "war_participants_war_id_user_id_key" ON "war_participants"("war_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_intel_war_id_observer_id_target_id_key" ON "player_intel"("war_id", "observer_id", "target_id");

-- CreateIndex
CREATE INDEX "war_events_war_id_is_public_announced_at_idx" ON "war_events"("war_id", "is_public", "announced_at");

-- CreateIndex
CREATE INDEX "war_events_participant_id_created_at_idx" ON "war_events"("participant_id", "created_at");

-- AddForeignKey
ALTER TABLE "war_locations" ADD CONSTRAINT "war_locations_war_id_fkey" FOREIGN KEY ("war_id") REFERENCES "grail_wars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "war_participants" ADD CONSTRAINT "war_participants_war_id_fkey" FOREIGN KEY ("war_id") REFERENCES "grail_wars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "war_participants" ADD CONSTRAINT "war_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "war_participants" ADD CONSTRAINT "war_participants_servant_id_fkey" FOREIGN KEY ("servant_id") REFERENCES "servants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "war_participants" ADD CONSTRAINT "war_participants_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "war_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_intel" ADD CONSTRAINT "player_intel_war_id_fkey" FOREIGN KEY ("war_id") REFERENCES "grail_wars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_intel" ADD CONSTRAINT "player_intel_observer_id_fkey" FOREIGN KEY ("observer_id") REFERENCES "war_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_intel" ADD CONSTRAINT "player_intel_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "war_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "war_events" ADD CONSTRAINT "war_events_war_id_fkey" FOREIGN KEY ("war_id") REFERENCES "grail_wars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "war_events" ADD CONSTRAINT "war_events_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "war_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
