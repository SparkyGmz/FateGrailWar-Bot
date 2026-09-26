/**
 * Itens. Catalisadores são itens do tipo CATALYST com `data.effects`.
 *
 * Cada efeito multiplica o peso dos Servants que combinam com o alvo:
 *   target: 'servant' | 'trait' | 'origin' | 'region' | 'class'
 *   value:  slug do Servant, trait, origem, região ou id da classe
 *   multiplier: fator aplicado ao peso (se vários efeitos casam, vale o maior)
 *
 * Catalisadores AUMENTAM chances — nunca garantem um Servant.
 */
import type { CatalystEffect } from '../modules/summon/summon.weights';

export interface ItemSeed {
  slug: string;
  name: string;
  type: 'CATALYST' | 'MATERIAL' | 'CONSUMABLE';
  emoji: string;
  rarity: number;
  description: string;
  data: { effects?: CatalystEffect[]; use?: { effect: 'bond_xp'; amount: number } } & Record<string, unknown>;
  dropWeight: number;
}

export const items: ItemSeed[] = [
  {
    slug: 'fragmento-espada-sagrada', name: 'Fragmento de Espada Sagrada', type: 'CATALYST', emoji: '🗡️', rarity: 4,
    description: 'Uma lasca de metal que ainda brilha como se refletisse um lago.',
    data: { effects: [
      { target: 'servant', value: 'artoria-pendragon', multiplier: 4 },
      { target: 'trait', value: 'Round Table', multiplier: 2 },
    ] },
    dropWeight: 5,
  },
  {
    slug: 'bainha-dourada', name: 'Fragmento da Bainha Dourada', type: 'CATALYST', emoji: '✨', rarity: 5,
    description: 'Dizem que quem a carrega não envelhece. Ressoa com o Rei e com seu mago.',
    data: { effects: [
      { target: 'servant', value: 'artoria-pendragon', multiplier: 4 },
      { target: 'servant', value: 'merlin', multiplier: 3 },
    ] },
    dropWeight: 2,
  },
  {
    slug: 'mesa-redonda-lasca', name: 'Lasca da Távola Redonda', type: 'CATALYST', emoji: '🪵', rarity: 3,
    description: 'Madeira antiga de Camelot. Atrai qualquer figura da lenda arturiana.',
    data: { effects: [{ target: 'origin', value: 'Lenda Arturiana', multiplier: 2.5 }] },
    dropWeight: 8,
  },
  {
    slug: 'retalho-manto-real', name: 'Retalho do Manto Real', type: 'CATALYST', emoji: '🧣', rarity: 4,
    description: 'Um pedaço de manto macedônio. Um professor de Londres teria algo a dizer sobre isso.',
    data: { effects: [
      { target: 'servant', value: 'iskandar', multiplier: 4 },
      { target: 'servant', value: 'zhuge-liang-waver', multiplier: 3 },
    ] },
    dropWeight: 4,
  },
  {
    slug: 'tabua-argila', name: 'Tábua de Argila de Uruk', type: 'CATALYST', emoji: '🧱', rarity: 4,
    description: 'Escrita cuneiforme que narra reis e deuses da Mesopotâmia.',
    data: { effects: [{ target: 'trait', value: 'Mesopotamian', multiplier: 3 }] },
    dropWeight: 5,
  },
  {
    slug: 'pena-gandiva', name: 'Corda do Arco Gandiva', type: 'CATALYST', emoji: '🪶', rarity: 4,
    description: 'Um fio divino que vibra com os heróis do Mahabharata.',
    data: { effects: [{ target: 'origin', value: 'Mahabharata', multiplier: 3.5 }] },
    dropWeight: 4,
  },
  {
    slug: 'espinho-terra-sombras', name: 'Espinho da Terra das Sombras', type: 'CATALYST', emoji: '🌑', rarity: 3,
    description: 'Um espinho frio vindo de Dún Scáith. Atrai guerreiros celtas.',
    data: { effects: [{ target: 'trait', value: 'Celtic', multiplier: 3 }] },
    dropWeight: 6,
  },
  {
    slug: 'folha-sakura', name: 'Pétala de Sakura Eterna', type: 'CATALYST', emoji: '🌸', rarity: 2,
    description: 'Uma pétala que nunca murcha. Ressoa com heróis do Japão.',
    data: { effects: [{ target: 'region', value: 'Japão', multiplier: 2 }] },
    dropWeight: 10,
  },
  {
    slug: 'mascara-caveira', name: 'Máscara de Caveira', type: 'CATALYST', emoji: '💀', rarity: 2,
    description: 'Uma máscara branca da Ordem dos Assassinos.',
    data: { effects: [{ target: 'trait', value: 'Hassan', multiplier: 3 }] },
    dropWeight: 10,
  },
  {
    slug: 'bisturi-enferrujado', name: 'Bisturi Enferrujado de Whitechapel', type: 'CATALYST', emoji: '🔪', rarity: 3,
    description: 'Neblina de Londres ainda gruda na lâmina.',
    data: { effects: [
      { target: 'servant', value: 'jack-the-ripper', multiplier: 4 },
      { target: 'trait', value: 'London', multiplier: 2 },
    ] },
    dropWeight: 6,
  },
  {
    slug: 'escama-dragao', name: 'Escama de Dragão', type: 'CATALYST', emoji: '🐉', rarity: 3,
    description: 'Dura como aço, quente como brasa.',
    data: { effects: [{ target: 'trait', value: 'Dragon', multiplier: 2.5 }] },
    dropWeight: 6,
  },
  {
    slug: 'fragmento-ceramica-grega', name: 'Fragmento de Ânfora Grega', type: 'CATALYST', emoji: '🏺', rarity: 2,
    description: 'Pintada com cenas de heróis e deuses do Olimpo.',
    data: { effects: [{ target: 'region', value: 'Grécia', multiplier: 2.5 }] },
    dropWeight: 10,
  },
  {
    slug: 'reliquia-divina', name: 'Relíquia Divina', type: 'CATALYST', emoji: '🌟', rarity: 3,
    description: 'Um objeto tocado por um deus. Atrai quem tem sangue divino.',
    data: { effects: [{ target: 'trait', value: 'Divine', multiplier: 2 }] },
    dropWeight: 7,
  },
  {
    slug: 'coroa-quebrada', name: 'Coroa Quebrada', type: 'CATALYST', emoji: '👑', rarity: 3,
    description: 'Pertenceu a algum soberano esquecido. Reis respondem ao seu chamado.',
    data: { effects: [{ target: 'trait', value: 'King', multiplier: 2 }] },
    dropWeight: 7,
  },

  // ============================ CONSUMÍVEIS ============================
  {
    slug: 'ticket-invocacao', name: 'Ticket de Invocação', type: 'CONSUMABLE', emoji: '🎫', rarity: 4,
    description: 'Um selo de mana condensada. Permite um ritual extra quando o summon semanal já foi usado.',
    data: {},
    dropWeight: 0,
  },
  {
    slug: 'incenso-vinculo', name: 'Incenso do Vínculo', type: 'CONSUMABLE', emoji: '🕯️', rarity: 2,
    description: 'Um aroma que lembra casa. Use em um Servant para aumentar o Bond.',
    data: { use: { effect: 'bond_xp', amount: 150 } },
    dropWeight: 0,
  },
  {
    slug: 'incenso-vinculo-raro', name: 'Incenso Dourado do Vínculo', type: 'CONSUMABLE', emoji: '🪔', rarity: 4,
    description: 'Queimado em cerimônias entre reis e seus cavaleiros. Aumenta bastante o Bond.',
    data: { use: { effect: 'bond_xp', amount: 500 } },
    dropWeight: 0,
  },
];
