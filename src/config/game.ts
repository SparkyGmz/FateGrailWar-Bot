/**
 * Configuração de balanceamento. Tudo que é "número de design" mora aqui,
 * não espalhado pelos serviços.
 */
export const gameConfig = {
  summon: {
    /**
     * 'fixed'   → reseta num dia/hora fixo da semana (todos ao mesmo tempo)
     * 'rolling' → 7 dias após o último summon de cada jogador
     */
    resetMode: 'fixed' as 'fixed' | 'rolling',
    /** 0 = domingo, 1 = segunda ... */
    resetDayOfWeek: 1,
    resetHour: 0,
    /** Fuso usado para o reset fixo. Brasília = -180 */
    utcOffsetMinutes: -180,
    rollingIntervalHours: 24 * 7,

    /** Peso base por raridade, quando o Servant não define summon_weight */
    rarityBaseWeight: { 1: 40, 2: 30, 3: 20, 4: 8, 5: 3 } as Record<number, number>,
    defaultFeaturedMultiplier: 3,

    /** Limite do multiplicador de um catalisador sobre um único Servant */
    catalystMaxMultiplier: 5,

    /** Spirit Origin ganho por duplicata, por raridade */
    duplicateSpiritOrigin: { 1: 5, 2: 10, 3: 25, 4: 60, 5: 150 } as Record<number, number>,

    /** Chance (0..1) de ganhar um catalisador aleatório a cada summon */
    catalystDropChance: 0.2,

    xpPerSummon: 50,
    coinsPerSummon: 100,

    /** Duração da "animação" do ritual, em ms */
    ritualDelayMs: 2500,
  },

  newPlayer: {
    startingCoins: 500,
    /** Quantos catalisadores aleatórios o jogador recebe ao criar o perfil */
    startingCatalysts: 1,
  },

  progression: {
    /** XP necessário para passar do nível `level` para `level + 1` */
    xpToNextLevel: (level: number) => Math.round(100 * Math.pow(level, 1.4)),
    maxLevel: 100,
  },

  bond: {
    maxLevel: 10,
    /** XP para ir do nível `level` ao `level + 1` (0→1 = 100, 9→10 = 1000) */
    xpToNextLevel: (level: number) => 100 * (level + 1),
  },

  missions: {
    /** Quantas expedições simultâneas o Master pode ter, pelo nível */
    maxConcurrent: (playerLevel: number) => (playerLevel >= 15 ? 3 : playerLevel >= 5 ? 2 : 1),
    /** Chance base antes de parâmetros/bônus */
    baseSuccess: 0.6,
    /** Quanto cada ponto de diferença entre parâmetro e dificuldade move a chance */
    statFactor: 0.12,
    /** "Parâmetro esperado" por dificuldade: 1.5 + dificuldade × 0.7 (D1≈D/C, D5≈A) */
    difficultyTarget: (difficulty: number) => 1.5 + difficulty * 0.7,
    /** Bônus de chance por nível de Bond com o Servant enviado */
    bondBonusPerLevel: 0.01,
    minChance: 0.05,
    maxChance: 0.95,
    /** Fração dos sucessos que viram "grande sucesso" */
    greatSuccessShare: 0.25,
    greatSuccessMultiplier: 1.5,
    /** Em falha, o jogador ainda leva esta fração de XP/bond (sem itens) */
    failureRewardShare: 0.3,
  },

  war: {
    defaultMinPlayers: 2,
    defaultMaxPlayers: 8,
    hardMaxPlayers: 16,
    defaultRegistrationHours: 48,

    /** Virada do dia da Guerra (mesmo fuso do summon) */
    dayResetHour: 0,
    apPerDay: 3,
    actionCost: { explore: 1, investigate: 1, hide: 1, train: 1, travel: 1, challenge: 1 } as Record<string, number>,

    commandSpells: 3,
    /** Regeneração na virada do dia, em fração do máximo */
    dailyHpRegen: 0.2,
    dailyMpRegen: 0.3,
    /** HP mínimo que eventos de exploração podem deixar (morte só em combate, V0.4) */
    minHpFromEvents: 1,

    /** Detecção: chance base × investigação do observador ÷ furtividade do alvo */
    detectBase: 0.7,
    /** /hide multiplica a furtividade por este valor até o fim do dia */
    hideStealthMultiplier: 1.8,
    investigateBase: 0.55,
    investigateSameLocationBonus: 1.2,
    minChance: 0.1,
    maxChance: 0.9,
    /** Chance de o alvo perceber que foi observado */
    noticeChance: 0.35,

    train: { bondXp: 40, maxStacks: 3 },
  },

  combat: {
    /** Tempo para cada jogador agir; ao estourar, o bot ataca por ele */
    turnTimeoutHours: 12,
    /** Custo de AP para desafiar */
    challengeCost: 1,

    // ---- fórmula de dano (ver modules/battle/combat.logic.ts)
    baseDamage: 150,
    strFactor: 45,
    /** Redução por ponto de END: dano ÷ (1 + END × endFactor) */
    endFactor: 0.08,
    minDamage: 15,
    variance: 0.1,
    critBasePerLuck: 0.03,
    critMultiplier: 1.5,
    /** Teto da chance de crítico, somando LUCK e todos os buffs */
    maxCritChance: 0.5,
    /** Faixa permitida para a soma de buffs/debuffs de cada atributo */
    buffCaps: {
      attack: [-0.6, 1.0],
      defense: [-0.6, 0.8],
      crit: [-0.5, 0.35],
      evade: [-0.5, 0.45],
    } as Record<string, [number, number]>,
    /** Turnos de recarga do Noble Phantasm após o uso */
    npCooldown: 3,
    evadePerAgilityPoint: 0.04,
    maxEvade: 0.45,
    defendMultiplier: 0.5,
    trainingBonusPerStack: 0.05,
    /** Bônus do primeiro golpe de quem tem ambushBonus (Assassin) */
    ambushTurns: 1,

    /** Vantagem de classe (atacante → defensor) */
    advantage: 1.1,
    disadvantage: 0.92,
    /** Triângulos clássicos: chave vence os valores */
    beats: {
      saber: ['lancer'],
      lancer: ['archer'],
      archer: ['saber'],
      rider: ['caster'],
      caster: ['assassin'],
      assassin: ['rider'],
    } as Record<string, string[]>,
    /** Berserker recebe mais dano de todos (o dano extra dele já vem do modificador da classe) */
    berserkerDealt: 1,
    berserkerTaken: 1.25,

    /** A partir deste turno, todo dano cresce (evita batalhas infinitas) */
    fatigueStartTurn: 15,
    fatiguePerTurn: 0.1,

    // ---- mana
    npCost: (npRankValue: number) => Math.round(40 + npRankValue * 5),
    mpRegenPerTurn: 8,

    // ---- recuo
    retreatAgilityFactor: 0.08,
  },

  victory: {
    winner: { xp: 1000, coins: 3000, spiritOrigin: 300, bondXp: 500, grails: 1 },
    participant: { xp: 200, xpPerKill: 150, coins: 500, bondXp: 150 },
    winnerTitle: 'Vencedor da {war}',
  },

  items: {
    /** Item consumido pelo /summon quando o summon gratuito já foi usado */
    summonTicketSlug: 'ticket-invocacao',
  },

  ui: {
    collectionPageSize: 10,
  },
};

export type GameConfig = typeof gameConfig;
export type SummonConfig = GameConfig['summon'];
