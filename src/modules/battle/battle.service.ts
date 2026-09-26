import { BattleStatus, WarStatus, type Battle, type Prisma } from '@prisma/client';
import { gameConfig } from '../../config/game';
import { prisma, type Tx } from '../../database/prisma';
import { GameError } from '../../shared/errors';
import { randomFloat } from '../../shared/random';
import { LogService } from '../logs/log.service';
import { act, loadParticipant, raiseIntel, type FullParticipant } from '../grail-war/war-action.service';
import { addWarEvent, WarService } from '../grail-war/war.service';
import { MAX_INTEL } from '../grail-war/war.logic';
import {
  critChance,
  endTurn,
  fatigueMultiplier,
  markNpUsed,
  npCooldownLeft,
  npManaCost,
  parseCombatMods,
  parseEffects,
  parseState,
  resolveEffects,
  retreatChance,
  skillManaCost,
  startTurn,
  type Combatant,
  type Effect,
} from './combat.logic';

const cfg = gameConfig.combat;
const LOG_LINES = 10;

export type CommandSpellUse = 'FULL_HEAL' | 'FORCED_NP' | 'ESCAPE' | 'TELEPORT';

export type BattleCommand =
  | { kind: 'ATTACK' }
  | { kind: 'DEFEND' }
  | { kind: 'SKILL'; skillSlug: string }
  | { kind: 'NP' }
  | { kind: 'RETREAT' }
  | { kind: 'COMMAND_SPELL'; use: CommandSpellUse };

const participantWithSkills = {
  user: true,
  location: true,
  servant: { include: { class: true, noblePhantasms: true, skills: { include: { skill: true }, orderBy: { slot: 'asc' } } } },
} as const;

async function loadFighter(db: Tx | typeof prisma, id: number) {
  return db.warParticipant.findUniqueOrThrow({ where: { id }, include: participantWithSkills });
}
type Fighter = Awaited<ReturnType<typeof loadFighter>>;

/** Nome público do Servant: classe, ou identidade se já revelada para todos */
export function publicLabel(p: { identityRevealed: boolean; servant: { name: string; class: { name: string } } | null }): string {
  if (!p.servant) return '???';
  return p.identityRevealed ? `${p.servant.class.name} (${p.servant.name})` : p.servant.class.name;
}

function toCombatant(p: Fighter, state: unknown): Combatant {
  const s = p.servant!;
  return {
    participantId: p.id,
    label: publicLabel(p),
    classId: s.classId,
    strength: s.strength,
    endurance: s.endurance,
    agility: s.agility,
    luck: s.luck,
    hp: p.currentHp,
    maxHp: p.maxHp,
    mp: p.currentMp,
    maxMp: p.maxMp,
    trainingStacks: p.trainingStacks,
    mods: parseCombatMods(s.class.modifiers),
    state: parseState(state),
  };
}

function deadline(): Date {
  return new Date(Date.now() + cfg.turnTimeoutHours * 3600 * 1000);
}

function asJson(v: unknown): Prisma.InputJsonValue {
  return v as Prisma.InputJsonValue;
}

async function activeBattleOf(db: Tx | typeof prisma, participantId: number) {
  return db.battle.findFirst({
    where: { status: BattleStatus.ACTIVE, OR: [{ attackerId: participantId }, { defenderId: participantId }] },
  });
}

async function moveToRandomNeighbor(tx: Tx, p: Fighter): Promise<string> {
  if (!p.location) return '???';
  const neighbors = await tx.warLocation.findMany({ where: { warId: p.warId, slug: { in: p.location.connections } } });
  const dest = neighbors[Math.floor(randomFloat() * neighbors.length)];
  if (!dest) return p.location.name;
  await tx.warParticipant.update({ where: { id: p.id }, data: { locationId: dest.id } });
  return `${dest.emoji} ${dest.name}`;
}

async function spendCommandSpell(tx: Tx, participantId: number): Promise<number> {
  const res = await tx.warParticipant.updateMany({
    where: { id: participantId, commandSpells: { gte: 1 } },
    data: { commandSpells: { decrement: 1 } },
  });
  if (res.count === 0) throw new GameError('Você não tem mais Selos de Comando. ⚪ ⚪ ⚪');
  const p = await tx.warParticipant.findUniqueOrThrow({ where: { id: participantId } });
  return p.commandSpells;
}

export interface BattleResult {
  battleId: number;
  ended: boolean;
  lines: string[];
}

export const BattleService = {
  // ------------------------------------------------------------ início

  async challenge(guildId: string, userId: string, targetUserId: string) {
    if (targetUserId === userId) throw new GameError('Você não pode desafiar a si mesmo.');
    let battleId = 0;
    const res = await act(guildId, userId, 'challenge', async ({ tx, war, me }) => {
      const t = await tx.warParticipant.findUnique({ where: { warId_userId: { warId: war.id, userId: targetUserId } } });
      if (!t || !t.alive) throw new GameError('Esse Master não está na Guerra (ou já foi eliminado).');
      if (t.locationId !== me.locationId) throw new GameError('Esse Master não está na sua região.');
      const intel = await tx.playerIntel.findUnique({
        where: { warId_observerId_targetId: { warId: war.id, observerId: me.id, targetId: t.id } },
      });
      if (!intel || intel.lastSeenDay !== war.currentDay || intel.lastSeenLocationId !== me.locationId) {
        throw new GameError('Você não sabe onde esse Master está agora. Encontre-o com `/explore` primeiro.');
      }
      if (await activeBattleOf(tx, t.id)) throw new GameError('Esse Master já está em combate.');

      const attacker = await loadFighter(tx, me.id);
      const mods = parseCombatMods(attacker.servant!.class.modifiers);
      const attackerState = parseState({});
      // Assassinos atacam das sombras: primeiro golpe fortalecido
      if (mods.ambushBonus > 1) {
        // Expira no fim do primeiro turno do atacante: vale só para o primeiro golpe
        attackerState.buffs.push({ stat: 'attack', value: mods.ambushBonus - 1, turns: cfg.ambushTurns, source: 'ambush' });
      }

      const battle = await tx.battle.create({
        data: {
          warId: war.id,
          locationId: me.locationId,
          attackerId: me.id,
          defenderId: t.id,
          currentActorId: me.id,
          turnDeadline: deadline(),
          attackerState: asJson(attackerState),
          defenderState: asJson(parseState({})),
          channelId: war.channelId,
          log: asJson([`⚔️ **${publicLabel(attacker)}** atacou em ${me.location!.emoji} ${me.location!.name}!`, ...(mods.ambushBonus > 1 ? ['🗡️ Ataque surpresa: o primeiro golpe é fortalecido.'] : [])]),
        },
      });
      battleId = battle.id;

      // Em combate, os dois veem ao menos a classe um do outro
      await raiseIntel(tx, war, me.id, t.id, { atLeast: 1, seenAt: me.locationId });
      await raiseIntel(tx, war, t.id, me.id, { atLeast: 1, seenAt: me.locationId });
      await addWarEvent(tx, {
        warId: war.id, day: war.currentDay, type: 'BATTLE_DEFENDER', participantId: t.id,
        message: `⚔️ Você foi atacado por **${attacker.user.username}** em ${me.location!.emoji} ${me.location!.name}!`,
      });
      await LogService.log(tx, userId, 'BATTLE_STARTED', { battleId: battle.id, warId: war.id, target: targetUserId });
      return { title: '⚔️ Combate iniciado!', lines: ['A batalha foi anunciada no canal da Guerra. Você age primeiro.'], color: 'danger' };
    });
    return { ...res, battleId };
  },

  // ------------------------------------------------------------ ações

  /** Resolve a ação do jogador da vez. `timeoutActorId` é usado pelo job de tempo esgotado. */
  async perform(battleId: number, userId: string | null, cmd: BattleCommand, timeoutActorId?: number): Promise<BattleResult> {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "battles" WHERE id = ${battleId} FOR UPDATE`;
      const battle = await tx.battle.findUniqueOrThrow({ where: { id: battleId }, include: { war: true } });
      if (battle.status !== BattleStatus.ACTIVE) throw new GameError('Esta batalha já terminou.');
      if (battle.war.status !== WarStatus.ACTIVE) throw new GameError('A Guerra não está em andamento.');
      if (battle.war.paused) throw new GameError('A Guerra está pausada pelo supervisor.');

      const [atk, def] = await Promise.all([loadFighter(tx, battle.attackerId), loadFighter(tx, battle.defenderId)]);
      const actorP = battle.currentActorId === atk.id ? atk : def;
      const enemyP = actorP === atk ? def : atk;
      if (timeoutActorId !== undefined) {
        if (timeoutActorId !== actorP.id) throw new GameError('O turno já mudou.');
      } else if (actorP.userId !== userId) {
        if (atk.userId !== userId && def.userId !== userId) throw new GameError('Você não participa desta batalha.');
        throw new GameError('Não é o seu turno.');
      }

      const actorIsAtk = actorP === atk;
      const actor = toCombatant(actorP, actorIsAtk ? battle.attackerState : battle.defenderState);
      const enemy = toCombatant(enemyP, actorIsAtk ? battle.defenderState : battle.attackerState);
      startTurn(actor);

      const lines: string[] = [];
      let damage = 0;
      let endsTurn = true;
      let ended: null | { reason: 'KO' | 'RETREAT' | 'ESCAPE'; winner: Fighter | null; loser: Fighter | null } = null;
      let enemyIntelGain = 0;
      let actorIntelGain = 0;
      let actionName: string = cmd.kind;

      const fatigue = fatigueMultiplier(battle.turn);
      if (fatigue > 1 && battle.turn === cfg.fatigueStartTurn + 1) {
        lines.push('🩸 *O combate se arrasta. A pressão do Graal torna cada golpe mais letal.*');
      }
      const runEffects = (effects: Effect[], source: string, opts: { powerBonus?: number; unavoidable?: boolean } = {}) => {
        const out = resolveEffects(actor, enemy, effects, { source, ...opts, powerBonus: (opts.powerBonus ?? 1) * fatigue });
        lines.push(...out.lines);
        damage += out.damage;
        actorIntelGain += out.informationLevels;
        if (out.enemyDied) ended = { reason: 'KO', winner: actorP, loser: enemyP };
      };

      const useNp = async (forced: boolean) => {
        const np = actorP.servant!.noblePhantasms[0];
        if (!np) throw new GameError('Este Servant não possui Noble Phantasm registrado.');
        const cost = npManaCost(np.rank, actor.mods);
        if (!forced) {
          const cd = npCooldownLeft(actor.state);
          if (cd > 0) throw new GameError(`O Noble Phantasm ainda está se recarregando (${cd} turno(s)). Um Selo de Comando pode forçá-lo.`);
          if (actor.mp < cost) throw new GameError(`Mana insuficiente para o Noble Phantasm (${actor.mp}/${cost} MP).`);
          actor.mp -= cost;
        }
        markNpUsed(actor.state);
        lines.push(`💥 **${actor.label}** revelou seu Noble Phantasm.`, `# ${np.name.toUpperCase()}`);
        runEffects(parseEffects(np.effects), `np:${np.name}`, { unavoidable: true, powerBonus: forced ? 1.2 : 1 });
        enemyIntelGain = Math.max(enemyIntelGain, 4); // o inimigo agora conhece o NP
        lines.push('🎭 *Identidade parcialmente revelada.*');
      };

      switch (cmd.kind) {
        case 'ATTACK':
          lines.push(timeoutActorId !== undefined ? `⌛ Tempo esgotado — **${actor.label}** ataca por instinto.` : `🗡️ **${actor.label}** ataca!`);
          runEffects([{ type: 'damage', power: 1 }], 'attack');
          actionName = timeoutActorId !== undefined ? 'TIMEOUT' : 'ATTACK';
          break;

        case 'DEFEND':
          actor.state.defending = true;
          lines.push(`🛡️ **${actor.label}** assume uma postura defensiva.`);
          break;

        case 'SKILL': {
          const link = actorP.servant!.skills.find((k) => k.skill.slug === cmd.skillSlug);
          if (!link) throw new GameError('Seu Servant não possui essa Skill.');
          const sk = link.skill;
          const cd = actor.state.cooldowns[sk.slug] ?? 0;
          if (cd > 0) throw new GameError(`**${sk.name}** está em recarga (${cd} turno(s)).`);
          const cost = skillManaCost(sk.manaCost, actor.mods);
          if (actor.mp < cost) throw new GameError(`Mana insuficiente para **${sk.name}** (${actor.mp}/${cost} MP).`);
          actor.mp -= cost;
          actor.state.cooldowns[sk.slug] = sk.cooldown + 1; // +1 porque o fim deste turno já desconta
          lines.push(`✨ **${actor.label}** usou **${sk.name}**!`);
          runEffects(parseEffects(sk.effects), `skill:${sk.slug}`);
          break;
        }

        case 'NP':
          await useNp(false);
          break;

        case 'RETREAT': {
          const chance = retreatChance(actor, enemy);
          if (randomFloat() < chance) {
            const where = await moveToRandomNeighbor(tx, actorP);
            lines.push(`🏃 **${actor.label}** recuou e escapou para uma região vizinha.`);
            ended = { reason: 'RETREAT', winner: null, loser: null };
            await addWarEvent(tx, {
              warId: battle.warId, day: battle.war.currentDay, type: 'RETREAT', participantId: actorP.id,
              message: `🏃 Você recuou da batalha e chegou a ${where}.`,
            });
          } else {
            lines.push(`🏃 **${actor.label}** tentou recuar, mas foi cercado! (${Math.round(chance * 100)}% de chance)`);
          }
          break;
        }

        case 'COMMAND_SPELL': {
          if (cmd.use === 'TELEPORT') throw new GameError('Teleporte só pode ser usado fora de combate. Em batalha, use **ESCAPE**.');
          const left = await spendCommandSpell(tx, actorP.id);
          const seals = '🔴 '.repeat(left) + '⚪ '.repeat(gameConfig.war.commandSpells - left);
          lines.push(`🩸 **${actorP.user.username}** usou um **Selo de Comando**! ${seals.trim()}`);
          await LogService.log(tx, actorP.userId, 'COMMAND_SPELL', { battleId, use: cmd.use, left });
          if (cmd.use === 'FULL_HEAL') {
            actor.hp = actor.maxHp;
            actor.state.buffs = actor.state.buffs.filter((b) => b.value >= 0 || b.stat === 'guts');
            actor.state.stunned = 0;
            lines.push(`💚 "Levante-se!" — **${actor.label}** é completamente restaurado. (ação livre)`);
            endsTurn = false;
          } else if (cmd.use === 'FORCED_NP') {
            lines.push('"Libere seu Noble Phantasm — agora!"');
            await useNp(true);
          } else if (cmd.use === 'ESCAPE') {
            const where = await moveToRandomNeighbor(tx, actorP);
            lines.push(`🌀 "Retire-se!" — **${actor.label}** desaparece do campo de batalha.`);
            ended = { reason: 'ESCAPE', winner: null, loser: null };
            await addWarEvent(tx, {
              warId: battle.warId, day: battle.war.currentDay, type: 'ESCAPE', participantId: actorP.id,
              message: `🌀 Você fugiu com um Selo de Comando e reapareceu em ${where}.`,
            });
          }
          break;
        }
      }

      // Passagem de turno (e atordoamento do próximo)
      let nextActorId = battle.currentActorId;
      let turn = battle.turn;
      if (!ended && endsTurn) {
        endTurn(actor);
        nextActorId = enemy.participantId;
        turn++;
        if (enemy.state.stunned > 0) {
          enemy.state.stunned--;
          startTurn(enemy);
          endTurn(enemy);
          lines.push(`💫 **${enemy.label}** está atordoado e perde o turno!`);
          nextActorId = actor.participantId;
          turn++;
        }
      }

      // Persistência
      const finished = ended as null | { reason: 'KO' | 'RETREAT' | 'ESCAPE'; winner: Fighter | null; loser: Fighter | null };
      await tx.warParticipant.update({
        where: { id: actor.participantId },
        data: { currentHp: actor.hp, currentMp: actor.mp, damageDealt: { increment: damage } },
      });
      await tx.warParticipant.update({ where: { id: enemy.participantId }, data: { currentHp: enemy.hp, currentMp: enemy.mp } });

      if (actorIntelGain > 0) {
        const { after } = await raiseIntelById(tx, battle.warId, actor.participantId, enemy.participantId, actorIntelGain);
        lines.push(`🔎 Você aprendeu mais sobre o inimigo (informação ${after}/${MAX_INTEL}).`);
      }
      if (enemyIntelGain > 0) await raiseIntelById(tx, battle.warId, enemy.participantId, actor.participantId, 0, enemyIntelGain);

      const prevLog = Array.isArray(battle.log) ? (battle.log as string[]) : [];
      const newLog = [...prevLog, `**Turno ${battle.turn}**`, ...lines].slice(-LOG_LINES * 2);
      const atkState = actorIsAtk ? actor.state : enemy.state;
      const defState = actorIsAtk ? enemy.state : actor.state;

      await tx.battle.update({
        where: { id: battleId },
        data: {
          turn,
          currentActorId: nextActorId,
          turnDeadline: deadline(),
          attackerState: asJson(atkState),
          defenderState: asJson(defState),
          log: asJson(newLog),
        },
      });
      await tx.battleAction.create({
        data: {
          battleId, turn: battle.turn, actorId: actor.participantId, action: actionName,
          payload: asJson(cmd), damage, result: lines.join('\n').slice(0, 2000),
        },
      });
      await LogService.log(tx, actorP.userId, 'BATTLE_ACTION', { battleId, action: actionName, damage });

      if (finished) await BattleService.finish(tx, battle, finished.reason, finished.winner, finished.loser, lines);
      return { battleId, ended: !!finished, lines };
    }, { timeout: 30000 });
  },

  /** Encerra a batalha; em KO elimina o perdedor e verifica a vitória da Guerra */
  async finish(
    tx: Tx,
    battle: Battle,
    reason: 'KO' | 'RETREAT' | 'ESCAPE',
    winner: Fighter | null,
    loser: Fighter | null,
    lines: string[],
  ) {
    await tx.battle.update({
      where: { id: battle.id },
      data: { status: BattleStatus.FINISHED, endedReason: reason, winnerId: winner?.id ?? null, endedAt: new Date() },
    });
    const [a, d] = await Promise.all([
      tx.warParticipant.findUniqueOrThrow({ where: { id: battle.attackerId } }),
      tx.warParticipant.findUniqueOrThrow({ where: { id: battle.defenderId } }),
    ]);
    for (const p of [a, d]) {
      if (!p.servantId) continue;
      await tx.playerServant.updateMany({
        where: { userId: p.userId, servantId: p.servantId },
        data: {
          battles: { increment: 1 },
          ...(winner?.id === p.id ? { wins: { increment: 1 }, kills: { increment: reason === 'KO' ? 1 : 0 } } : {}),
        },
      });
    }

    if (reason === 'KO' && winner && loser) {
      const war = await tx.grailWar.findUniqueOrThrow({ where: { id: battle.warId } });
      await tx.warParticipant.update({ where: { id: loser.id }, data: { alive: false, currentHp: 0 } });
      await tx.warParticipant.update({ where: { id: winner.id }, data: { kills: { increment: 1 } } });
      const alive = await tx.warParticipant.count({ where: { warId: battle.warId, alive: true } });
      lines.push('', `☠️ **${loser.servant!.class.name.toUpperCase()} foi eliminado.**`);
      await addWarEvent(tx, {
        warId: battle.warId, day: war.currentDay, type: 'ELIMINATION', isPublic: true,
        message: `☠️ **${loser.servant!.class.name.toUpperCase()} foi eliminado.**\n\nMaster **${loser.user.username}** foi eliminado da Guerra.\nRestam **${alive}** Masters.`,
      });
      await LogService.log(tx, loser.userId, 'ELIMINATION', { warId: battle.warId, by: winner.userId });
      if (alive <= 1) {
        const last = await tx.warParticipant.findFirst({ where: { warId: battle.warId, alive: true } });
        await WarService.finishWar(tx, battle.warId, last?.id ?? null);
      }
    }
    await LogService.log(tx, winner?.userId ?? null, 'BATTLE_ENDED', { battleId: battle.id, reason });
  },

  // ------------------------------------------------------------ Selos fora de combate

  async commandSpellOutside(guildId: string, userId: string, use: CommandSpellUse, destSlug: string | null) {
    const war = await WarService.requireOpenWar(guildId);
    if (war.status !== WarStatus.ACTIVE || war.paused) throw new GameError('A Guerra não está em andamento.');
    return prisma.$transaction(async (tx) => {
      const me = await tx.warParticipant.findUnique({ where: { warId_userId: { warId: war.id, userId } } });
      if (!me || !me.alive) throw new GameError('Você não está ativo nesta Guerra.');
      const battle = await activeBattleOf(tx, me.id);
      if (battle) throw new GameError('Você está em combate — use o Selo pela batalha (`/commandspell` durante o seu turno ou o botão 🔴).');
      if (use === 'FORCED_NP' || use === 'ESCAPE') throw new GameError('Esse Selo só faz sentido durante um combate.');

      let text = '';
      if (use === 'TELEPORT') {
        if (!destSlug) throw new GameError('Escolha o destino do teleporte (opção `destino`).');
        const dest = await tx.warLocation.findUnique({ where: { warId_slug: { warId: war.id, slug: destSlug } } });
        if (!dest) throw new GameError('Região desconhecida.');
        const left = await spendCommandSpell(tx, me.id);
        await tx.warParticipant.update({ where: { id: me.id }, data: { locationId: dest.id } });
        text = `🌀 Seu Servant atravessa o espaço e surge em ${dest.emoji} **${dest.name}**.\nSelos restantes: **${left}**`;
      } else {
        const left = await spendCommandSpell(tx, me.id);
        await tx.warParticipant.update({ where: { id: me.id }, data: { currentHp: me.maxHp, currentMp: me.maxMp } });
        text = `💚 Seu Servant é completamente restaurado (HP e MP).\nSelos restantes: **${left}**`;
      }
      await addWarEvent(tx, { warId: war.id, day: war.currentDay, type: 'COMMAND_SPELL', participantId: me.id, message: `Usou um Selo de Comando (${use}).` });
      await LogService.log(tx, userId, 'COMMAND_SPELL', { warId: war.id, use });
      return text;
    });
  },

  // ------------------------------------------------------------ consultas

  async activeBattleFor(guildId: string, userId: string) {
    const war = await WarService.getOpenWar(guildId);
    if (!war) return null;
    const me = await prisma.warParticipant.findUnique({ where: { warId_userId: { warId: war.id, userId } } });
    if (!me) return null;
    return activeBattleOf(prisma, me.id);
  },

  /** Dados para a mensagem pública da batalha */
  async publicView(battleId: number) {
    const battle = await prisma.battle.findUniqueOrThrow({ where: { id: battleId }, include: { war: true } });
    const [a, d] = await Promise.all([loadParticipant(prisma, battle.attackerId), loadParticipant(prisma, battle.defenderId)]);
    const location = battle.locationId ? await prisma.warLocation.findUnique({ where: { id: battle.locationId } }) : null;
    return { battle, attacker: a, defender: d, location };
  },

  /** Painel privado de quem está em combate */
  async privateView(battleId: number, userId: string) {
    const battle = await prisma.battle.findUniqueOrThrow({ where: { id: battleId } });
    const [atk, def] = await Promise.all([loadFighter(prisma, battle.attackerId), loadFighter(prisma, battle.defenderId)]);
    const me = atk.userId === userId ? atk : def.userId === userId ? def : null;
    if (!me) throw new GameError('Você não participa desta batalha.');
    const combatant = toCombatant(me, me === atk ? battle.attackerState : battle.defenderState);
    const np = me.servant!.noblePhantasms[0] ?? null;
    return {
      battle,
      me,
      myTurn: battle.currentActorId === me.id,
      combatant,
      skills: me.servant!.skills.map((k) => ({
        slug: k.skill.slug,
        name: k.skill.name,
        description: k.skill.description,
        cost: skillManaCost(k.skill.manaCost, combatant.mods),
        cooldown: combatant.state.cooldowns[k.skill.slug] ?? 0,
      })),
      np: np ? { name: np.name, rank: np.rank, cost: npManaCost(np.rank, combatant.mods), cooldown: npCooldownLeft(combatant.state) } : null,
      critChance: critChance(combatant),
      commandSpells: me.commandSpells,
    };
  },

  async expiredTurns(now = new Date()) {
    return prisma.battle.findMany({
      where: { status: BattleStatus.ACTIVE, turnDeadline: { lte: now }, war: { status: WarStatus.ACTIVE, paused: false } },
      select: { id: true, currentActorId: true },
    });
  },

  async setMessage(battleId: number, channelId: string, messageId: string) {
    await prisma.battle.update({ where: { id: battleId }, data: { channelId, messageId } });
  },
};

/** Sobe o nível de informação por id de participante (usado pelo combate) */
async function raiseIntelById(tx: Tx, warId: number, observerId: number, targetId: number, increment: number, atLeast = 0) {
  const war = await tx.grailWar.findUniqueOrThrow({ where: { id: warId } });
  const existing = await tx.playerIntel.findUnique({ where: { warId_observerId_targetId: { warId, observerId, targetId } } });
  const before = existing?.informationLevel ?? 0;
  const after = Math.min(MAX_INTEL, Math.max(before + increment, atLeast));
  await raiseIntel(tx, war, observerId, targetId, { atLeast: after });
  return { before, after };
}

export type { FullParticipant };
