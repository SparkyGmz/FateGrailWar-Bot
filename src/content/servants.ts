/**
 * Catálogo de Servants da V0.1 (56 Servants — 8 por classe).
 *
 * Para adicionar um Servant: acrescente uma entrada aqui e rode `npm run db:seed`.
 * Nenhum código de sistema precisa mudar.
 *
 * stats = [STR, END, AGI, MANA, LUCK, NP]
 * Os parâmetros, raridades e nomes de NP foram preenchidos a partir das fontes
 * mais comuns da franquia, mas várias versões divergem entre obras —
 * revise livremente, isto é conteúdo de balanceamento.
 */
export interface ServantSeed {
  slug: string;
  name: string;
  class: string;
  rarity: 1 | 2 | 3 | 4 | 5;
  alignment: string;
  gender: 'Masculino' | 'Feminino' | 'Indefinido';
  origin: string;
  region: string;
  era: string;
  stats: [string, string, string, string, string, string];
  traits: string[];
  np: { name: string; type: string };
  description: string;
  summonWeight?: number;
}

export const servants: ServantSeed[] = [
  // ============================== SABER ==============================
  {
    slug: 'artoria-pendragon', name: 'Artoria Pendragon', class: 'saber', rarity: 5,
    alignment: 'Leal Bom', gender: 'Feminino', origin: 'Lenda Arturiana', region: 'Grã-Bretanha', era: 'Idade Média',
    stats: ['B', 'B', 'C', 'B', 'A+', 'A++'],
    traits: ['Dragon', 'King', 'Arthurian', 'Round Table', 'Riding', 'Humanoid'],
    np: { name: 'Excalibur', type: 'Anti-Fortaleza' },
    description: 'O Rei dos Cavaleiros, portadora da espada sagrada forjada pelos desejos da humanidade.',
  },
  {
    slug: 'mordred', name: 'Mordred', class: 'saber', rarity: 5,
    alignment: 'Caótico Bom', gender: 'Feminino', origin: 'Lenda Arturiana', region: 'Grã-Bretanha', era: 'Idade Média',
    stats: ['B+', 'A', 'B', 'C', 'D', 'A'],
    traits: ['Dragon', 'Arthurian', 'Round Table', 'Riding', 'Humanoid'],
    np: { name: 'Clarent Blood Arthur', type: 'Anti-Exército' },
    description: 'Cavaleiro da Traição, cria do Rei, que ergueu a espada contra Camelot.',
  },
  {
    slug: 'nero-claudius', name: 'Nero Claudius', class: 'saber', rarity: 4,
    alignment: 'Caótico Bom', gender: 'Feminino', origin: 'História de Roma', region: 'Itália', era: 'Antiguidade',
    stats: ['D', 'C', 'A', 'B', 'A', 'B'],
    traits: ['Roman', 'King', 'Humanoid'],
    np: { name: 'Aestus Domus Aurea', type: 'Anti-Exército' },
    description: 'A Imperatriz autoproclamada artista, que ergue seu teatro dourado no campo de batalha.',
  },
  {
    slug: 'okita-souji', name: 'Okita Souji', class: 'saber', rarity: 5,
    alignment: 'Neutro Neutro', gender: 'Feminino', origin: 'Shinsengumi', region: 'Japão', era: 'Bakumatsu',
    stats: ['C', 'E', 'A+', 'E', 'D', 'C'],
    traits: ['Shinsengumi', 'Japanese', 'Humanoid'],
    np: { name: 'Mumyou Sandanzuki', type: 'Anti-Unidade' },
    description: 'Gênio da espada da Shinsengumi, veloz como um relâmpago e frágil de saúde.',
  },
  {
    slug: 'miyamoto-musashi', name: 'Miyamoto Musashi', class: 'saber', rarity: 5,
    alignment: 'Caótico Neutro', gender: 'Feminino', origin: 'Japão feudal', region: 'Japão', era: 'Período Edo',
    stats: ['B', 'B', 'A+', 'E', 'A', 'A+'],
    traits: ['Japanese', 'Humanoid'],
    np: { name: 'Rikudou Gorin Kurikara Tenshou', type: 'Anti-Unidade' },
    description: 'Espadachim errante das duas espadas, em busca do Vazio além da técnica.',
  },
  {
    slug: 'siegfried', name: 'Siegfried', class: 'saber', rarity: 4,
    alignment: 'Caótico Bom', gender: 'Masculino', origin: 'Canção dos Nibelungos', region: 'Alemanha', era: 'Idade Média',
    stats: ['B+', 'A', 'C', 'D', 'E', 'A'],
    traits: ['Dragon', 'Riding', 'Humanoid'],
    np: { name: 'Balmung', type: 'Anti-Exército' },
    description: 'O Matador de Dragões, banhado no sangue de Fafnir e quase invulnerável.',
  },
  {
    slug: 'gawain', name: 'Gawain', class: 'saber', rarity: 4,
    alignment: 'Leal Bom', gender: 'Masculino', origin: 'Lenda Arturiana', region: 'Grã-Bretanha', era: 'Idade Média',
    stats: ['B+', 'B+', 'B', 'A', 'A', 'A+'],
    traits: ['Arthurian', 'Round Table', 'Riding', 'Humanoid'],
    np: { name: 'Excalibur Galatine', type: 'Anti-Exército' },
    description: 'Cavaleiro do Sol, cuja força triplica sob a luz do dia.',
  },
  {
    slug: 'lancelot-saber', name: 'Lancelot', class: 'saber', rarity: 4,
    alignment: 'Leal Bom', gender: 'Masculino', origin: 'Lenda Arturiana', region: 'Grã-Bretanha', era: 'Idade Média',
    stats: ['A', 'B', 'A+', 'C', 'B', 'A'],
    traits: ['Arthurian', 'Round Table', 'Riding', 'Humanoid'],
    np: { name: 'Arondight Overload', type: 'Anti-Unidade' },
    description: 'O Cavaleiro do Lago em sua forma sã: o maior espadachim da Távola Redonda.',
  },

  // ============================== ARCHER ==============================
  {
    slug: 'emiya', name: 'EMIYA', class: 'archer', rarity: 4,
    alignment: 'Neutro Neutro', gender: 'Masculino', origin: 'Fate/stay night', region: 'Japão', era: 'Futuro',
    stats: ['D', 'C', 'C', 'B', 'E', '?'],
    traits: ['Humanoid'],
    np: { name: 'Unlimited Blade Works', type: 'Anti-Exército' },
    description: 'Um herói sem nome que projeta lâminas a partir de um mundo interior de espadas.',
  },
  {
    slug: 'gilgamesh', name: 'Gilgamesh', class: 'archer', rarity: 5,
    alignment: 'Caótico Bom', gender: 'Masculino', origin: 'Epopeia de Gilgamesh', region: 'Mesopotâmia', era: 'Era dos Deuses',
    stats: ['B', 'C', 'C', 'B', 'A', 'EX'],
    traits: ['Divine', 'King', 'Mesopotamian', 'Humanoid'],
    np: { name: 'Enuma Elish', type: 'Anti-Mundo' },
    description: 'O Rei dos Heróis, dono de todos os tesouros do mundo.',
  },
  {
    slug: 'arjuna', name: 'Arjuna', class: 'archer', rarity: 5,
    alignment: 'Leal Neutro', gender: 'Masculino', origin: 'Mahabharata', region: 'Índia', era: 'Antiguidade',
    stats: ['B', 'B', 'B', 'B', 'A++', 'EX'],
    traits: ['Divine', 'King', 'Indian', 'Humanoid'],
    np: { name: 'Pashupata', type: 'Anti-Deus' },
    description: 'O herói perfeito do Mahabharata, arqueiro abençoado pelos deuses e rival eterno de Karna.',
  },
  {
    slug: 'robin-hood', name: 'Robin Hood', class: 'archer', rarity: 3,
    alignment: 'Neutro Bom', gender: 'Masculino', origin: 'Folclore inglês', region: 'Inglaterra', era: 'Idade Média',
    stats: ['D', 'C', 'B', 'B', 'E', 'D'],
    traits: ['Humanoid'],
    np: { name: 'Yew Bow', type: 'Anti-Unidade' },
    description: 'O arqueiro sem rosto de Sherwood, mestre de emboscadas e venenos.',
  },
  {
    slug: 'atalanta', name: 'Atalanta', class: 'archer', rarity: 4,
    alignment: 'Neutro Mau', gender: 'Feminino', origin: 'Mitologia Grega', region: 'Grécia', era: 'Era dos Deuses',
    stats: ['D', 'E', 'A', 'B', 'C', 'B'],
    traits: ['Greek', 'Argonaut', 'Humanoid'],
    np: { name: 'Phoebus Catastrophe', type: 'Anti-Exército' },
    description: 'A caçadora mais veloz da Grécia, que suplica aos deuses com suas flechas.',
  },
  {
    slug: 'chiron', name: 'Chiron', class: 'archer', rarity: 4,
    alignment: 'Leal Bom', gender: 'Masculino', origin: 'Mitologia Grega', region: 'Grécia', era: 'Era dos Deuses',
    stats: ['B', 'A', 'A', 'B', 'C', 'A'],
    traits: ['Divine', 'Greek', 'Riding'],
    np: { name: 'Antares Snipe', type: 'Anti-Unidade' },
    description: 'O sábio centauro, mestre de heróis como Heracles e Aquiles.',
  },
  {
    slug: 'nikola-tesla', name: 'Nikola Tesla', class: 'archer', rarity: 5,
    alignment: 'Caótico Bom', gender: 'Masculino', origin: 'História moderna', region: 'Estados Unidos', era: 'Era Moderna',
    stats: ['B', 'B', 'C', 'A+', 'B', 'A'],
    traits: ['Humanoid', 'Hero of Civilization'],
    np: { name: 'System Keraunos', type: 'Anti-Cidade' },
    description: 'O homem que roubou o raio dos céus e o entregou à humanidade.',
  },
  {
    slug: 'james-moriarty', name: 'James Moriarty', class: 'archer', rarity: 5,
    alignment: 'Caótico Mau', gender: 'Masculino', origin: 'Sherlock Holmes', region: 'Inglaterra', era: 'Era Vitoriana',
    stats: ['D', 'D', 'C', 'A', 'EX', 'A'],
    traits: ['Humanoid', 'London'],
    np: { name: 'The Dynamics of an Asteroid', type: 'Anti-Unidade' },
    description: 'O Napoleão do Crime, cujo arsenal se esconde num caixão de armas.',
  },

  // ============================== LANCER ==============================
  {
    slug: 'cu-chulainn-prototype', name: 'Cú Chulainn (Prototype)', class: 'lancer', rarity: 3,
    alignment: 'Leal Neutro', gender: 'Masculino', origin: 'Ciclo do Ulster', region: 'Irlanda', era: 'Antiguidade',
    stats: ['B', 'C', 'A', 'C', 'D', 'B+'],
    traits: ['Divine', 'Celtic', 'Riding', 'Humanoid'],
    np: { name: 'Gáe Bolg', type: 'Anti-Unidade' },
    description: 'O Cão de Culann em sua forma jovem e nobre, cavaleiro orgulhoso do Ulster.',
  },
  {
    slug: 'cu-chulainn', name: 'Cú Chulainn', class: 'lancer', rarity: 3,
    alignment: 'Leal Neutro', gender: 'Masculino', origin: 'Ciclo do Ulster', region: 'Irlanda', era: 'Antiguidade',
    stats: ['B', 'C', 'A', 'C', 'E', 'B'],
    traits: ['Divine', 'Celtic', 'Riding', 'Humanoid'],
    np: { name: 'Gáe Bolg', type: 'Anti-Unidade' },
    description: 'O Cão de Culann, cuja lança amaldiçoada inverte causa e efeito.',
  },
  {
    slug: 'karna', name: 'Karna', class: 'lancer', rarity: 5,
    alignment: 'Leal Bom', gender: 'Masculino', origin: 'Mahabharata', region: 'Índia', era: 'Antiguidade',
    stats: ['B', 'A', 'A', 'B', 'A+', 'EX'],
    traits: ['Divine', 'Indian', 'King', 'Riding', 'Humanoid'],
    np: { name: 'Vasavi Shakti', type: 'Anti-Deus' },
    description: 'O Herói da Caridade, filho do deus Sol, protegido por uma armadura dourada.',
  },
  {
    slug: 'scathach', name: 'Scáthach', class: 'lancer', rarity: 5,
    alignment: 'Neutro Bom', gender: 'Feminino', origin: 'Mitologia Celta', region: 'Escócia', era: 'Antiguidade',
    stats: ['B', 'A', 'A+', 'C', 'D', 'A+'],
    traits: ['Divine', 'Celtic', 'King', 'Humanoid'],
    np: { name: 'Gáe Bolg Alternative', type: 'Anti-Unidade' },
    description: 'A Rainha da Terra das Sombras, mestra de Cú Chulainn, incapaz de morrer.',
  },
  {
    slug: 'diarmuid-ua-duibhne', name: 'Diarmuid Ua Duibhne', class: 'lancer', rarity: 3,
    alignment: 'Leal Neutro', gender: 'Masculino', origin: 'Ciclo Feniano', region: 'Irlanda', era: 'Antiguidade',
    stats: ['B', 'C', 'A+', 'E', 'D', 'B'],
    traits: ['Celtic', 'Riding', 'Humanoid'],
    np: { name: 'Gáe Dearg & Gáe Buidhe', type: 'Anti-Unidade' },
    description: 'Cavaleiro dos Fianna, dono de duas lanças e de uma pinta de amor amaldiçoada.',
  },
  {
    slug: 'enkidu', name: 'Enkidu', class: 'lancer', rarity: 5,
    alignment: 'Neutro Neutro', gender: 'Indefinido', origin: 'Epopeia de Gilgamesh', region: 'Mesopotâmia', era: 'Era dos Deuses',
    stats: ['A', 'A', 'A', 'A', 'B', 'A++'],
    traits: ['Divine', 'Mesopotamian'],
    np: { name: 'Enuma Elish (Correntes do Céu)', type: 'Anti-Purificação' },
    description: 'Arma forjada pelos deuses e único amigo de Gilgamesh; capaz de assumir qualquer forma.',
  },
  {
    slug: 'brynhild', name: 'Brynhild', class: 'lancer', rarity: 5,
    alignment: 'Leal Bom', gender: 'Feminino', origin: 'Saga dos Volsungos', region: 'Escandinávia', era: 'Era dos Deuses',
    stats: ['B+', 'A', 'A', 'B', 'E', 'A'],
    traits: ['Divine', 'Norse', 'Humanoid'],
    np: { name: 'Brynhild Romantia', type: 'Anti-Unidade' },
    description: 'A valquíria que amou Sigurd; sua lança cresce conforme seu amor.',
  },
  {
    slug: 'ereshkigal', name: 'Ereshkigal', class: 'lancer', rarity: 5,
    alignment: 'Leal Bom', gender: 'Feminino', origin: 'Mitologia Mesopotâmica', region: 'Mesopotâmia', era: 'Era dos Deuses',
    stats: ['C', 'B', 'B', 'A+', 'E', 'A'],
    traits: ['Divine', 'Mesopotamian', 'Humanoid'],
    np: { name: 'Kur Kigal Irkalla', type: 'Anti-Cidade' },
    description: 'A deusa do Submundo mesopotâmico, severa e solitária guardiã dos mortos.',
  },

  // ============================== RIDER ==============================
  {
    slug: 'medusa', name: 'Medusa', class: 'rider', rarity: 3,
    alignment: 'Caótico Bom', gender: 'Feminino', origin: 'Mitologia Grega', region: 'Grécia', era: 'Era dos Deuses',
    stats: ['B', 'E', 'A', 'B', 'E', 'A+'],
    traits: ['Divine', 'Greek', 'Riding', 'Humanoid'],
    np: { name: 'Bellerophon', type: 'Anti-Exército' },
    description: 'A górgona de olhos petrificantes, que cavalga o Pégaso.',
  },
  {
    slug: 'iskandar', name: 'Iskandar', class: 'rider', rarity: 5,
    alignment: 'Neutro Bom', gender: 'Masculino', origin: 'História da Macedônia', region: 'Macedônia', era: 'Antiguidade',
    stats: ['B', 'A', 'D', 'C', 'A+', 'A++'],
    traits: ['King', 'Riding', 'Humanoid'],
    np: { name: 'Ionioi Hetairoi', type: 'Anti-Exército' },
    description: 'O Rei da Conquista, que convoca seu exército eterno de companheiros.',
  },
  {
    slug: 'achilles', name: 'Achilles', class: 'rider', rarity: 5,
    alignment: 'Leal Neutro', gender: 'Masculino', origin: 'Ilíada', region: 'Grécia', era: 'Era dos Deuses',
    stats: ['B+', 'A', 'A+', 'C', 'D', 'A+'],
    traits: ['Divine', 'Greek', 'Riding', 'Humanoid'],
    np: { name: 'Troias Tragoidia', type: 'Anti-Exército' },
    description: 'O herói mais veloz de Troia, invulnerável a não ser pelo calcanhar.',
  },
  {
    slug: 'ozymandias', name: 'Ozymandias', class: 'rider', rarity: 5,
    alignment: 'Caótico Neutro', gender: 'Masculino', origin: 'História do Egito', region: 'Egito', era: 'Antiguidade',
    stats: ['B', 'A', 'D', 'A+', 'A', 'EX'],
    traits: ['Divine', 'King', 'Egyptian', 'Riding', 'Humanoid'],
    np: { name: 'Ramesseum Tentyris', type: 'Anti-Fortaleza' },
    description: 'O Rei dos Reis do Egito, que traz consigo o próprio templo.',
  },
  {
    slug: 'quetzalcoatl', name: 'Quetzalcoatl', class: 'rider', rarity: 5,
    alignment: 'Caótico Bom', gender: 'Feminino', origin: 'Mitologia Mesoamericana', region: 'México', era: 'Era dos Deuses',
    stats: ['B', 'A', 'A', 'A+', 'A', 'A'],
    traits: ['Divine', 'Riding', 'Humanoid'],
    np: { name: 'Xiuhcoatl', type: 'Anti-Exército' },
    description: 'A serpente emplumada, deusa solar amante da luta livre.',
  },
  {
    slug: 'astolfo', name: 'Astolfo', class: 'rider', rarity: 4,
    alignment: 'Caótico Bom', gender: 'Masculino', origin: 'Canção de Rolando', region: 'França', era: 'Idade Média',
    stats: ['D', 'D', 'B', 'C', 'A+', 'C'],
    traits: ['Paladin', 'Riding', 'Humanoid'],
    np: { name: 'Hippogriff', type: 'Anti-Exército' },
    description: 'Um dos Doze Paladinos de Carlos Magno, alegre, imprevisível e montado num hipogrifo.',
  },
  {
    slug: 'ushiwakamaru', name: 'Ushiwakamaru', class: 'rider', rarity: 3,
    alignment: 'Caótico Neutro', gender: 'Feminino', origin: 'Contos de Heike', region: 'Japão', era: 'Período Heian',
    stats: ['C', 'C', 'A+', 'B', 'A', 'A'],
    traits: ['Japanese', 'Riding', 'Humanoid'],
    np: { name: 'Dan-no-Ura Hassou Tobi', type: 'Anti-Unidade' },
    description: 'Minamoto-no-Yoshitsune na juventude, general genial e leal ao irmão.',
  },
  {
    slug: 'francis-drake', name: 'Francis Drake', class: 'rider', rarity: 5,
    alignment: 'Caótico Mau', gender: 'Feminino', origin: 'História da Inglaterra', region: 'Inglaterra', era: 'Era das Navegações',
    stats: ['C', 'A', 'D', 'E', 'EX', 'A+'],
    traits: ['Riding', 'Humanoid', 'Hero of Civilization'],
    np: { name: 'Golden Wild Hunt', type: 'Anti-Exército' },
    description: 'A pirata que circunavegou o mundo e derrotou a Armada Invencível.',
  },

  // ============================== CASTER ==============================
  {
    slug: 'medea', name: 'Medea', class: 'caster', rarity: 3,
    alignment: 'Neutro Mau', gender: 'Feminino', origin: 'Mitologia Grega', region: 'Grécia', era: 'Era dos Deuses',
    stats: ['E', 'D', 'C', 'A+', 'B', 'C'],
    traits: ['Greek', 'Argonaut', 'Humanoid'],
    np: { name: 'Rule Breaker', type: 'Anti-Magia' },
    description: 'A Bruxa da Traição, maga da Era dos Deuses capaz de romper qualquer contrato.',
  },
  {
    slug: 'merlin', name: 'Merlin', class: 'caster', rarity: 5,
    alignment: 'Caótico Bom', gender: 'Masculino', origin: 'Lenda Arturiana', region: 'Grã-Bretanha', era: 'Idade Média',
    stats: ['C', 'E', 'B', 'A+', 'B', 'EX'],
    traits: ['Arthurian', 'Humanoid'],
    np: { name: 'Garden of Avalon', type: 'Barreira' },
    description: 'O Mago das Flores, conselheiro do Rei Arthur e observador eterno da humanidade.',
  },
  {
    slug: 'zhuge-liang-waver', name: 'Zhuge Liang (Waver)', class: 'caster', rarity: 5,
    alignment: 'Neutro Bom', gender: 'Masculino', origin: 'Lord El-Melloi II / Romance dos Três Reinos', region: 'Inglaterra', era: 'Era Moderna',
    stats: ['E', 'E', 'D', 'A', 'A', 'C'],
    traits: ['Humanoid', 'Pseudo-Servant', 'London'],
    np: { name: 'Unreturning Formation', type: 'Barreira' },
    description: 'Um professor londrino que carrega o Espírito Heroico do grande estrategista chinês.',
  },
  {
    slug: 'gilgamesh-caster', name: 'Gilgamesh (Caster)', class: 'caster', rarity: 4,
    alignment: 'Caótico Bom', gender: 'Masculino', origin: 'Epopeia de Gilgamesh', region: 'Mesopotâmia', era: 'Era dos Deuses',
    stats: ['C', 'B', 'C', 'A', 'A', 'B'],
    traits: ['Divine', 'King', 'Mesopotamian', 'Humanoid'],
    np: { name: 'Gate of Babylon', type: 'Anti-Exército' },
    description: 'O Rei de Uruk em seus anos de sabedoria, governante sóbrio e implacável.',
  },
  {
    slug: 'nitocris', name: 'Nitocris', class: 'caster', rarity: 4,
    alignment: 'Leal Bom', gender: 'Feminino', origin: 'História do Egito', region: 'Egito', era: 'Antiguidade',
    stats: ['E', 'C', 'B', 'A', 'A', 'A'],
    traits: ['Divine', 'King', 'Egyptian', 'Humanoid'],
    np: { name: 'Anpu Neb Ta Djeser', type: 'Anti-Unidade' },
    description: 'A faraó rainha, sacerdotisa do deus Anúbis, que conduz os inimigos ao submundo.',
  },
  {
    slug: 'tamamo-no-mae', name: 'Tamamo-no-Mae', class: 'caster', rarity: 5,
    alignment: 'Neutro Mau', gender: 'Feminino', origin: 'Folclore japonês', region: 'Japão', era: 'Período Heian',
    stats: ['E', 'E', 'B', 'A', 'D', 'B'],
    traits: ['Divine', 'Japanese', 'Humanoid'],
    np: { name: 'Eightfold Blessing of Amaterasu', type: 'Anti-Exército' },
    description: 'Uma fração da deusa do sol na forma de uma raposa de muitas caudas.',
  },
  {
    slug: 'circe', name: 'Circe', class: 'caster', rarity: 4,
    alignment: 'Neutro Mau', gender: 'Feminino', origin: 'Odisseia', region: 'Grécia', era: 'Era dos Deuses',
    stats: ['E', 'C', 'B', 'A+', 'B', 'B'],
    traits: ['Divine', 'Greek', 'Humanoid'],
    np: { name: 'Metabolismos Kykeon', type: 'Anti-Unidade' },
    description: 'A feiticeira de Eeia, que transforma homens em porcos e cozinha poções.',
  },
  {
    slug: 'hans-christian-andersen', name: 'Hans Christian Andersen', class: 'caster', rarity: 2,
    alignment: 'Neutro Neutro', gender: 'Masculino', origin: 'Literatura dinamarquesa', region: 'Dinamarca', era: 'Século XIX',
    stats: ['E', 'E', 'E', 'C', 'E', 'C'],
    traits: ['Humanoid', 'Author'],
    np: { name: 'Märchen Meines Lebens', type: 'Suporte' },
    description: 'O autor de contos de fadas mais ácido da história, que reescreve heróis com sua pena.',
  },

  // ============================== ASSASSIN ==============================
  {
    slug: 'sasaki-kojirou', name: 'Sasaki Kojirou', class: 'assassin', rarity: 1,
    alignment: 'Caótico Mau', gender: 'Masculino', origin: 'Japão feudal', region: 'Japão', era: 'Período Edo',
    stats: ['C', 'E', 'A+', 'E', 'A', '—'],
    traits: ['Japanese', 'Humanoid'],
    np: { name: 'Tsubame Gaeshi', type: 'Anti-Unidade' },
    description: 'Um espadachim sem nome cuja técnica corta de três direções ao mesmo tempo.',
  },
  {
    slug: 'hassan-cursed-arm', name: 'Hassan of the Cursed Arm', class: 'assassin', rarity: 1,
    alignment: 'Leal Mau', gender: 'Masculino', origin: 'Ordem dos Assassinos', region: 'Oriente Médio', era: 'Idade Média',
    stats: ['B', 'C', 'A', 'C', 'E', 'C'],
    traits: ['Hassan', 'Humanoid'],
    np: { name: 'Zabaniya: Delusional Heartbeat', type: 'Anti-Unidade' },
    description: 'O Hassan do braço amaldiçoado, que esmaga corações à distância.',
  },
  {
    slug: 'jack-the-ripper', name: 'Jack the Ripper', class: 'assassin', rarity: 5,
    alignment: 'Caótico Mau', gender: 'Feminino', origin: 'Londres vitoriana', region: 'Inglaterra', era: 'Era Vitoriana',
    stats: ['C', 'C', 'A', 'C', 'E', 'C'],
    traits: ['Humanoid', 'London'],
    np: { name: 'Maria the Ripper', type: 'Anti-Unidade' },
    description: 'O assassino de Whitechapel na forma de uma criança feita de rancores.',
  },
  {
    slug: 'hassan-hundred-personas', name: 'Hassan of the Hundred Personas', class: 'assassin', rarity: 2,
    alignment: 'Leal Mau', gender: 'Feminino', origin: 'Ordem dos Assassinos', region: 'Oriente Médio', era: 'Idade Média',
    stats: ['D', 'D', 'A', 'B', 'B', 'B'],
    traits: ['Hassan', 'Humanoid'],
    np: { name: 'Zabaniya: Delusional Illusion', type: 'Anti-Exército' },
    description: 'O Hassan de personalidades múltiplas, capaz de se dividir em dezenas de corpos.',
  },
  {
    slug: 'first-hassan', name: 'First Hassan', class: 'assassin', rarity: 5,
    alignment: 'Leal Neutro', gender: 'Masculino', origin: 'Ordem dos Assassinos', region: 'Oriente Médio', era: 'Idade Média',
    stats: ['B', 'A', 'C', 'E', 'E', 'C'],
    traits: ['Hassan', 'Humanoid'],
    np: { name: 'Azrael', type: 'Anti-Unidade' },
    description: 'O Velho da Montanha, primeiro de todos os Hassan, que anuncia a hora da morte.',
  },
  {
    slug: 'shuten-douji', name: 'Shuten-Douji', class: 'assassin', rarity: 5,
    alignment: 'Caótico Mau', gender: 'Feminino', origin: 'Folclore japonês', region: 'Japão', era: 'Período Heian',
    stats: ['C', 'A', 'C', 'A', 'B', 'B'],
    traits: ['Oni', 'Demonic', 'Japanese', 'Humanoid'],
    np: { name: 'Senshibankoku Shinpen Kidoku', type: 'Anti-Exército' },
    description: 'A rainha oni do Monte Ooe, cujo saquê dissolve corpo e alma.',
  },
  {
    slug: 'semiramis', name: 'Semiramis', class: 'assassin', rarity: 5,
    alignment: 'Leal Mau', gender: 'Feminino', origin: 'Lendas assírias', region: 'Assíria', era: 'Antiguidade',
    stats: ['E', 'D', 'D', 'A', 'A', 'EX'],
    traits: ['Divine', 'King', 'Mesopotamian', 'Humanoid'],
    np: { name: 'Hanging Gardens of Babylon', type: 'Anti-Mundo' },
    description: 'A Rainha Assíria, primeira envenenadora da história, soberana de um jardim flutuante.',
  },
  {
    slug: 'fuuma-kotarou', name: 'Fuuma Kotarou', class: 'assassin', rarity: 3,
    alignment: 'Caótico Neutro', gender: 'Masculino', origin: 'Período Sengoku', region: 'Japão', era: 'Período Sengoku',
    stats: ['D', 'D', 'A+', 'C', 'D', 'C'],
    traits: ['Japanese', 'Humanoid'],
    np: { name: 'Fuuma Tobikato', type: 'Anti-Exército' },
    description: 'O líder ninja do clã Fuuma, cujo nome era usado por gerações de sombras.',
  },

  // ============================== BERSERKER ==============================
  {
    slug: 'heracles', name: 'Heracles', class: 'berserker', rarity: 4,
    alignment: 'Caótico Louco', gender: 'Masculino', origin: 'Mitologia Grega', region: 'Grécia', era: 'Era dos Deuses',
    stats: ['A+', 'A', 'A', 'A', 'B', 'A'],
    traits: ['Divine', 'Greek', 'Argonaut', 'Humanoid'],
    np: { name: 'Nine Lives', type: 'Anti-Unidade' },
    description: 'O maior herói da Grécia, que precisa ser morto doze vezes.',
  },
  {
    slug: 'lancelot-berserker', name: 'Lancelot', class: 'berserker', rarity: 4,
    alignment: 'Leal Louco', gender: 'Masculino', origin: 'Lenda Arturiana', region: 'Grã-Bretanha', era: 'Idade Média',
    stats: ['A', 'A', 'A+', 'C', 'B', 'A'],
    traits: ['Arthurian', 'Round Table', 'Riding', 'Humanoid'],
    np: { name: 'Knight of Owner', type: 'Anti-Unidade' },
    description: 'O Cavaleiro Negro, enlouquecido pela culpa, que transforma tudo o que toca em arma.',
  },
  {
    slug: 'spartacus', name: 'Spartacus', class: 'berserker', rarity: 1,
    alignment: 'Neutro Louco', gender: 'Masculino', origin: 'História de Roma', region: 'Itália', era: 'Antiguidade',
    stats: ['A', 'EX', 'D', 'E', 'D', 'A'],
    traits: ['Humanoid'],
    np: { name: 'Crying Warmonger', type: 'Anti-Unidade' },
    description: 'O gladiador rebelde que sorri diante da dor e a transforma em força.',
  },
  {
    slug: 'kintoki', name: 'Kintoki', class: 'berserker', rarity: 5,
    alignment: 'Caótico Bom', gender: 'Masculino', origin: 'Folclore japonês', region: 'Japão', era: 'Período Heian',
    stats: ['A+', 'B', 'B', 'C', 'C', 'C'],
    traits: ['Divine', 'Japanese', 'Humanoid'],
    np: { name: 'Golden Spark', type: 'Anti-Unidade' },
    description: 'Sakata Kintoki, o garoto dourado criado nas montanhas, dono de um machado relâmpago.',
  },
  {
    slug: 'minamoto-no-raikou', name: 'Minamoto-no-Raikou', class: 'berserker', rarity: 5,
    alignment: 'Caótico Mau', gender: 'Feminino', origin: 'Folclore japonês', region: 'Japão', era: 'Período Heian',
    stats: ['A', 'B', 'B', 'A', 'C', 'A'],
    traits: ['Divine', 'Japanese', 'Humanoid'],
    np: { name: 'Gyuuou Shouraiten', type: 'Anti-Exército' },
    description: 'A caçadora de oni do período Heian, maternal até o limite da loucura.',
  },
  {
    slug: 'arjuna-alter', name: 'Arjuna Alter', class: 'berserker', rarity: 5,
    alignment: 'Leal Louco', gender: 'Masculino', origin: 'Mahabharata', region: 'Índia', era: 'Antiguidade',
    stats: ['A', 'A', 'B', 'A', 'B', 'EX'],
    traits: ['Divine', 'Indian'],
    np: { name: 'Pashupata (Alter)', type: 'Anti-Deus' },
    description: 'Arjuna após absorver os deuses de sua terra: um julgamento divino sem emoção.',
  },
  {
    slug: 'morgan', name: 'Morgan', class: 'berserker', rarity: 5,
    alignment: 'Leal Mau', gender: 'Feminino', origin: 'Lenda Arturiana', region: 'Grã-Bretanha', era: 'Idade Média',
    stats: ['C', 'B', 'C', 'EX', 'D', 'A'],
    traits: ['King', 'Arthurian', 'Humanoid'],
    np: { name: 'Rhongomyniad', type: 'Anti-Fortaleza' },
    description: 'A Rainha das Fadas, irmã do Rei Arthur, que governou uma Grã-Bretanha alternativa.',
  },
  {
    slug: 'kiyohime', name: 'Kiyohime', class: 'berserker', rarity: 3,
    alignment: 'Caótico Mau', gender: 'Feminino', origin: 'Folclore japonês', region: 'Japão', era: 'Período Heian',
    stats: ['E', 'E', 'C', 'E', 'E', 'EX'],
    traits: ['Dragon', 'Japanese', 'Humanoid'],
    np: { name: 'Transforming, Flame-Emitting Meditation', type: 'Anti-Unidade' },
    description: 'A jovem que se tornou serpente de fogo para perseguir um monge mentiroso.',
  },
];
