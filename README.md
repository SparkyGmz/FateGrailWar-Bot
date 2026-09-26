# Fate: Holy Grail War RPG — Bot de Discord (V0.4)

RPG persistente de Fate dentro do Discord. - **V0.1**: perfil automático, catálogo de 56 Servants (8 por classe), summon semanal com banners rotativos e catalisadores, coleção e duplicatas → Spirit Origin.
- **V0.2**: Bond com recompensas por nível e títulos, missões PvE assíncronas (expedições), inventário, itens consumíveis, loja com limites semanais e Tickets de Invocação.
- **V0.3**: primeira Guerra do Santo Graal — inscrição, contrato secreto, mapa de Fuyuki em grafo, AP diário, exploração, investigação e identidade oculta por Master.
- **V0.4**: combate por turnos assíncrono, Skills e Noble Phantasms data-driven, Selos de Comando, eliminação, vitória, recompensas e histórico.

## Requisitos

- Node.js 20+ (testado com 22)
- Docker (para o PostgreSQL) ou um PostgreSQL 14+ próprio
- Uma aplicação no [Discord Developer Portal](https://discord.com/developers/applications)

## Rodando pela primeira vez

```bash
# 1. dependências
npm install

# 2. banco
docker compose up -d db

# 3. variáveis de ambiente
cp .env.example .env        # preencha DISCORD_TOKEN, DISCORD_CLIENT_ID e DEV_GUILD_ID

# 4. cria as tabelas (gera a primeira migration) e popula o conteúdo
npx prisma migrate dev --name init
npm run db:seed

# 5. registra os slash commands
npm run deploy-commands

# 6. liga o bot
npm run dev
```

No Developer Portal: em **Bot** copie o token; em **OAuth2 → URL Generator** marque os escopos `bot` e `applications.commands` e a permissão *Send Messages* / *Embed Links*, e use a URL para convidar o bot. Nenhuma intent privilegiada é necessária.

Com `DEV_GUILD_ID` preenchido os comandos aparecem na hora naquele servidor. Deixe vazio em produção para registrar globalmente.

## Comandos

| Comando | O que faz |
|---|---|
| `/profile [master]` | Perfil do Master: nível, XP, Servants, Grails, favorito, status do summon |
| `/summon [catalyst]` | Ritual semanal. Sem opção, abre o ritual com menu de catalisadores e prévia de ressonância |
| `/banner` | Banner ativo, taxas por Servant e próximos banners |
| `/servants [classe] [master]` | Coleção paginada |
| `/servant nome` | Ficha completa do Servant (parâmetros, NP, traits, dados de contrato) |
| `/favorite servant` | Define o Servant favorito exibido no perfil |
| `/catalysts` | Seus catalisadores e com quem ressoam no banner atual (ephemeral) |
| `/bond servant` | Vínculo com um Servant, estatísticas e próxima recompensa |
| `/mission list [servant]` | Missões disponíveis (com a chance do Servant, se informado) |
| `/mission start missao servant` | Envia um Servant livre em expedição |
| `/mission status` · `/mission claim` | Acompanha e resgata expedições concluídas |
| `/inventory` | Todos os itens e moedas (ephemeral) |
| `/use item [servant]` | Usa um consumível (ex.: incenso de Bond) |
| `/shop` · `/buy item [quantidade]` | Loja com moedas / Spirit Origin |
| `/title titulo` | Equipa um título no perfil |
| `/grailwar status` · `join` · `leave` · `servant` · `log` | Guerra: situação, inscrição, contrato secreto, diário privado |
| `/grailwar create` · `start` · `pause` · `resume` · `end` · `next-day` | Supervisor (permissão *Gerenciar Servidor*) |
| `/location` · `/intel [master]` | Região atual e dossiê de inimigos (sem custo) |
| `/travel` · `/explore` · `/investigate` · `/hide` · `/train` | Ações da Guerra (1 AP cada) |
| `/battle challenge master` | Ataca um Master encontrado hoje na sua região (1 AP) |
| `/battle attack` · `defend` · `skill` · `retreat` · `status` | Ações de combate (ou pelos botões da mensagem da batalha) |
| `/np` | Libera o Noble Phantasm (revela o NP ao inimigo) |
| `/commandspell uso [destino]` | Selos de Comando: cura total, NP forçado, fuga, teleporte |
| `/admin give-item` · `give-currency` · `finish-missions` · `reset-summon` | Ferramentas de administrador/teste |

O perfil é criado automaticamente no primeiro comando, com moedas iniciais e um catalisador aleatório.

## Arquitetura

```
src/
  index.ts                 bootstrap (Discord + Prisma + jobs)
  config/                  env (validado com zod) e game.ts (balanceamento)
  content/                 CONTEÚDO do jogo: classes, Servants, itens, banners
  database/                Prisma client
  modules/                 regras de negócio — não conhecem o Discord
    users/ servants/ summon/ pools/ inventory/ logs/
  discord/
    commands/              recebem a interação e chamam os serviços
    embeds/                apresentação
    interactions/router.ts roteamento, criação de perfil, tratamento de erros
  jobs/                    tarefas agendadas (anúncio de banner)
  shared/                  RNG, formatação, ranks, erros
prisma/
  schema.prisma  seed.ts
tests/                     testes das regras puras e da integridade do conteúdo
```

Os comandos só traduzem Discord ↔ serviço. `SummonService`, `UserService` etc. podem alimentar um site ou app no futuro sem mudanças.

## Data-driven: como adicionar conteúdo

Nada de `if (servant == "Arjuna")`. Tudo fica em `src/content/` e vai para o banco com `npm run db:seed` (idempotente, pode rodar sempre).

**Novo Servant** → uma entrada em `src/content/servants.ts`. Se o `summonWeight` for omitido, o peso vem da raridade (`config/game.ts`).

**Novo catalisador** → uma entrada em `src/content/items.ts`. Os efeitos multiplicam pesos por alvo:

```ts
{ target: 'servant', value: 'artoria-pendragon', multiplier: 4 }
{ target: 'trait',   value: 'Round Table',       multiplier: 2 }
// também: 'origin', 'region', 'class'
```

Se vários efeitos casam com um Servant, vale o maior, limitado por `catalystMaxMultiplier`. Catalisadores nunca garantem um resultado, e o bot recusa um catalisador que não ressoa com ninguém no banner atual (em vez de consumi-lo à toa).

**Novo banner** → um tema em `src/content/pools.ts`. O seed gera `rotationWeeks` semanas de rotação; o tema de cada semana é derivado do número absoluto da semana, então rodar o seed de novo nunca troca o banner de uma semana já criada. O pool **Invocação Padrão** (todos os Servants) é o fallback quando nenhum banner temático está ativo.

**Classes** → `src/content/classes.ts`. Os `modifiers` (dano, defesa, movimento, investigação, furtividade, chance de recuo, custo de mana…) já ficam no banco para os sistemas das próximas versões.

O seed valida o conteúdo antes de gravar (slugs duplicados, Servants inexistentes em banners/catalisadores, classes inválidas) e `npm test` checa as mesmas coisas.

> Os parâmetros, raridades e nomes de NP do catálogo foram preenchidos com base nas fontes mais comuns da franquia, mas várias obras divergem entre si — vale uma revisão, especialmente de Fuuma Kotarou, Minamoto-no-Raikou, Arjuna Alter e Morgan.

## Missões, Bond e loja (V0.2)

**Missões** (`src/content/missions.ts`) são expedições: o Servant fica fora por um tempo e volta com o resultado. A chance é calculada no envio:

```
chance = 60% + (média dos parâmetros testados − dificuldade esperada) × 12%
         + bônus de classe + maior bônus de trait + 1% por nível de Bond
         (limitada entre 5% e 95%)
```

No resgate: 25% dos sucessos viram **grande sucesso** (recompensas ×1,5 e mais chance de drop); em **falha** o jogador leva 30% do XP e do Bond, sem itens. O número de expedições simultâneas cresce com o nível do Master (1 → 2 no nível 5 → 3 no 15). Tudo isso está em `config/game.ts → missions`.

**Bond** sobe com missões e incensos (`/use`). Cada nível entrega as recompensas de `src/content/bond-rewards.ts` — globais (`servant: null`) e exclusivas por Servant, incluindo títulos.

**Loja** (`src/content/shop.ts`) vende em moedas ou Spirit Origin, com limite semanal por jogador. O **Ticket de Invocação** permite um summon extra: o `/summon` usa o gratuito se disponível e, senão, oferece usar um ticket.

Operações que mexem em saldo/inventário (compra, missão, uso de item, summon com ticket) travam a linha do jogador (`SELECT … FOR UPDATE`) e rodam em transação, então cliques duplos não geram compras ou resgates duplicados.

## Guerra do Santo Graal (V0.3)

O estado da Guerra (`war_participants`) é separado da conta permanente: HP, MP, AP, selos, posição e preparo existem só naquela Guerra. A coleção nunca é afetada.

**Ciclo:** `create` (REGISTRATION) → inscrições encerram sozinhas no prazo (PREPARATION) → `start` (ACTIVE, dia 1) → o dia vira à meia-noite de Brasília, restaurando AP e regenerando HP/MP → `end`. Combate, morte e vitória chegam na V0.4.

**Mapa** (`src/content/maps.ts`): grafo de regiões com perigo e efeitos (furtividade, investigação, mana). Cada Guerra copia o template, então é possível ter mapas diferentes. Riders se movem 2 regiões por viagem (modificador `movement` da classe).

**Exploração** (`src/content/war-events.ts`): tabela de eventos por nível de perigo — nada, item, catalisador, NPC (boatos que revelam Masters), inimigo, armadilha, evento especial e encontros. Encontrar um Master **não** revela seu Servant; detectar um Servant revela só a classe. Detecção = investigação do observador ÷ furtividade do alvo (classe × `/hide` × região).

**Informação** é guardada por observador em `player_intel`, em 6 níveis: Master conhecido → classe → STR/END/AGI → origem, era, MANA/LUCK → Noble Phantasm → identidade. `/investigate` sobe um nível por sucesso. O alvo pode perceber que foi observado (aparece no diário dele).

**Privacidade:** todas as respostas de ações são ephemeral. O canal da Guerra recebe só a crônica pública (início, novos dias, inscrições), publicada pelo scheduler a partir de `war_events` — os serviços nunca falam com o Discord diretamente.

**Concorrência:** cada ação trava a linha do participante (`SELECT … FOR UPDATE`), gasta AP e aplica o efeito na mesma transação. Se a ação falhar, o AP volta.

## Combate (V0.4)

Batalhas são 1 contra 1, por turnos e **assíncronas**: cada jogador tem `turnTimeoutHours` (12 h) para agir; se o tempo acabar, o Servant ataca sozinho. A mensagem pública da batalha fica no canal da Guerra com botões — mas só quem está na vez consegue agir, e Skills/Selos abrem menus privados.

**Para desafiar**, o alvo precisa estar na sua região **e** ter sido detectado por você hoje (`/explore`). Assassins começam com o golpe de emboscada.

**Fórmula** (`modules/battle/combat.logic.ts` + `config/game.ts → combat`):

```
dano = (base + STR × fator) × poder × modificador de classe × vantagem de classe
       × (1 + buffs de ataque) × (1 + preparo do /train) × crítico
       ÷ (1 + END × fator de defesa)   × variação ±10%   (× 0,5 se defendendo)
```

Esquiva vem da diferença de AGI + buffs; crítico vem de LUCK + buffs. Triângulos: Saber > Lancer > Archer > Saber e Rider > Caster > Assassin > Rider; Berserker recebe mais dano de todos. A partir do turno 15 o dano cresce a cada turno. O equilíbrio foi calibrado com simulações de milhares de lutas (a maioria termina entre 7 e 17 turnos).

**Skills** (`src/content/skills.ts`): biblioteca de 26 Skills clássicas; cada classe tem 3 padrão e alguns Servants têm listas próprias. **Noble Phantasms** (`src/content/np-effects.ts`): efeito vem do tipo (Anti-Unidade, Anti-Exército, Barreira…) com overrides por Servant. Ambos usam o mesmo motor de efeitos: dano, cura, buff, debuff, atordoamento, mana, cleanse, dispel, Guts e informação.

Usar o NP é sempre certeiro, mas revela o nome dele ao inimigo (informação nível 4).

**Selos de Comando** (3 por Guerra): cura total (ação livre), NP forçado (sem custo e +20%), fuga (encerra a batalha) e teleporte (fora de combate).

**Morte e vitória:** HP 0 elimina o Master da Guerra — a coleção permanente não é afetada. Com um único Master vivo, a Guerra termina: o vencedor recebe Grail, XP, moedas, Spirit Origin, catalisador, Bond e o título de vencedor; todos recebem recompensas de participação (mais XP por abate). O histórico vai para `war_history` e **as identidades de todos os Servants são reveladas** no canal.

## Summon: regras e concorrência

- **Reset semanal** configurável em `config/game.ts`: `fixed` (todo mundo reseta segunda 00:00 de Brasília, padrão) ou `rolling` (7 dias após o último summon). O cooldown mora no banco (`last_free_summon_at`), então sobrevive a reinícios.
- **Peso final** = base (override do banner → `summon_weight` → peso da raridade) × destaque do banner × catalisador.
- **Duplicatas** viram Spirit Origin por raridade e incrementam `duplicates` do Servant.
- **Drop**: cada summon tem 20% de chance de render um catalisador aleatório (por `drop_weight`).

Tudo roda numa transação. O "claim" do summon é um `UPDATE … WHERE last_free_summon_at < limite`: o Postgres serializa updates na mesma linha, então dois `/summon` simultâneos resultam em exatamente um sucesso. O catalisador é consumido com `UPDATE … WHERE quantity >= 1`. Se qualquer passo falhar, nada é gravado — nem o summon é gasto, nem o catalisador.

O RNG usa `node:crypto`. Cada summon grava `summon_history` (com a probabilidade no momento do sorteio) e `action_logs`.

## Scripts

| Script | |
|---|---|
| `npm run dev` | bot com reload |
| `npm run build` / `npm start` | produção |
| `npm run deploy-commands` | registra slash commands |
| `npm run db:migrate` / `db:deploy` | migrations (dev / produção) |
| `npm run db:seed` | sincroniza o conteúdo |
| `npm run db:studio` | inspecionar o banco pelo navegador |
| `npm test` / `npm run typecheck` | testes e checagem de tipos |

Docker completo (bot + banco): `docker compose --profile full up -d --build`. O container aplica as migrations e o seed ao subir — gere a migration inicial (`prisma migrate dev`) antes do primeiro build.

## Próximas versões

O schema já reserva o que as próximas etapas usam (bond, contadores de batalha em `player_servants`, `modifiers` de classe, `effects` de NP, wins/losses/grails no perfil).

- **V1.0** — polimento, estabilidade e o painel administrativo web
