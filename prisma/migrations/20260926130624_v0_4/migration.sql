-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('ACTIVE', 'FINISHED');

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "cooldown" INTEGER NOT NULL DEFAULT 3,
    "mana_cost" INTEGER NOT NULL DEFAULT 0,
    "target_type" TEXT NOT NULL DEFAULT 'self',
    "effects" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servant_skills" (
    "servant_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,

    CONSTRAINT "servant_skills_pkey" PRIMARY KEY ("servant_id","skill_id")
);

-- CreateTable
CREATE TABLE "battles" (
    "id" SERIAL NOT NULL,
    "war_id" INTEGER NOT NULL,
    "location_id" INTEGER,
    "status" "BattleStatus" NOT NULL DEFAULT 'ACTIVE',
    "turn" INTEGER NOT NULL DEFAULT 1,
    "attacker_id" INTEGER NOT NULL,
    "defender_id" INTEGER NOT NULL,
    "current_actor_id" INTEGER NOT NULL,
    "turn_deadline" TIMESTAMP(3) NOT NULL,
    "attacker_state" JSONB NOT NULL DEFAULT '{}',
    "defender_state" JSONB NOT NULL DEFAULT '{}',
    "log" JSONB NOT NULL DEFAULT '[]',
    "channel_id" TEXT,
    "message_id" TEXT,
    "winner_id" INTEGER,
    "ended_reason" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_actions" (
    "id" SERIAL NOT NULL,
    "battle_id" INTEGER NOT NULL,
    "turn" INTEGER NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "damage" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "war_history" (
    "id" SERIAL NOT NULL,
    "war_id" INTEGER NOT NULL,
    "winner_id" TEXT,
    "servant_id" INTEGER,
    "participants" JSONB NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "finished_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "war_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE INDEX "battles_war_id_status_idx" ON "battles"("war_id", "status");

-- CreateIndex
CREATE INDEX "battles_status_turn_deadline_idx" ON "battles"("status", "turn_deadline");

-- CreateIndex
CREATE INDEX "battle_actions_battle_id_turn_idx" ON "battle_actions"("battle_id", "turn");

-- CreateIndex
CREATE UNIQUE INDEX "war_history_war_id_key" ON "war_history"("war_id");

-- AddForeignKey
ALTER TABLE "servant_skills" ADD CONSTRAINT "servant_skills_servant_id_fkey" FOREIGN KEY ("servant_id") REFERENCES "servants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servant_skills" ADD CONSTRAINT "servant_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_war_id_fkey" FOREIGN KEY ("war_id") REFERENCES "grail_wars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_attacker_id_fkey" FOREIGN KEY ("attacker_id") REFERENCES "war_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_defender_id_fkey" FOREIGN KEY ("defender_id") REFERENCES "war_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_actions" ADD CONSTRAINT "battle_actions_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "war_history" ADD CONSTRAINT "war_history_war_id_fkey" FOREIGN KEY ("war_id") REFERENCES "grail_wars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
