import type { Command, ComponentHandler } from '../types';
import { adminCommand } from './admin';
import { bannerCommand } from './banner';
import { catalystsCommand } from './catalysts';
import { profileCommand } from './profile';
import { favoriteCommand, favoriteComponents, servantCommand } from './servant';
import { collectionComponents, servantsCommand } from './servants';
import { summonCommand, summonComponents } from './summon';
import { bondCommand } from './bond';
import { inventoryCommand, useCommand } from './inventory';
import { missionCommand } from './mission';
import { buyCommand, shopCommand } from './shop';
import { titleCommand } from './title';
import { grailwarCommand } from './grailwar';
import {
  battleButtons,
  battleCommand,
  battleCommandSpellSelect,
  battleSkillSelect,
  commandSpellCommand,
  npCommand,
} from './battle';
import {
  exploreCommand,
  hideCommand,
  intelCommand,
  investigateCommand,
  locationCommand,
  trainCommand,
  travelCommand,
} from './war-actions';

export const commands: Command[] = [
  profileCommand,
  summonCommand,
  bannerCommand,
  servantsCommand,
  servantCommand,
  favoriteCommand,
  catalystsCommand,
  bondCommand,
  missionCommand,
  inventoryCommand,
  useCommand,
  shopCommand,
  buyCommand,
  titleCommand,
  grailwarCommand,
  locationCommand,
  travelCommand,
  exploreCommand,
  investigateCommand,
  hideCommand,
  trainCommand,
  intelCommand,
  battleCommand,
  npCommand,
  commandSpellCommand,
  adminCommand,
];

export const componentHandlers: ComponentHandler[] = [
  summonComponents,
  collectionComponents,
  favoriteComponents,
  battleButtons,
  battleSkillSelect,
  battleCommandSpellSelect,
];
