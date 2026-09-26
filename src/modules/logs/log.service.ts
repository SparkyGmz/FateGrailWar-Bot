import type { Prisma } from '@prisma/client';
import type { Db } from '../../database/prisma';

export type LogAction =
  | 'USER_CREATED'
  | 'SUMMON'
  | 'ITEM_RECEIVED'
  | 'ITEM_SPENT'
  | 'FAVORITE_SET'
  | 'ADMIN_GIVE_ITEM'
  | 'ADMIN_RESET_SUMMON'
  | 'LEVEL_UP'
  | 'BOND_XP'
  | 'MISSION_STARTED'
  | 'MISSION_CLAIMED'
  | 'SHOP_PURCHASE'
  | 'ITEM_USED'
  | 'TITLE_EQUIPPED'
  | 'ADMIN_GIVE_CURRENCY'
  | 'ADMIN_FINISH_MISSIONS'
  | 'WAR_CREATED'
  | 'WAR_JOINED'
  | 'WAR_LEFT'
  | 'WAR_CONTRACT'
  | 'WAR_STARTED'
  | 'WAR_STATUS'
  | 'WAR_DAY'
  | 'WAR_ACTION'
  | 'BATTLE_STARTED'
  | 'BATTLE_ACTION'
  | 'BATTLE_ENDED'
  | 'COMMAND_SPELL'
  | 'ELIMINATION'
  | 'WAR_VICTORY'
  | 'WAR_REWARD';

export const LogService = {
  async log(db: Db, userId: string | null, action: LogAction, payload: Prisma.InputJsonValue = {}): Promise<void> {
    await db.actionLog.create({ data: { userId, action, payload } });
  },
};
