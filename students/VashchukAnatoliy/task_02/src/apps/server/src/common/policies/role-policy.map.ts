import { Role } from '../enums/role.enum';
import { Action } from '../enums/action.enum';

export const RolePolicy: Record<Role, readonly Action[]> = {
  [Role.USER]: [
    Action.VIEW_POST,
    Action.CREATE_POST,
    Action.EDIT_POST,
    Action.DELETE_POST,
    Action.VIEW_FEED,
    Action.VIEW_EXPLORE,
    Action.FOLLOW,
    Action.UNFOLLOW,
    Action.LIKE,
    Action.UNLIKE,
    Action.CREATE_REPLY,
    Action.VIEW_REPLIES,
    Action.CREATE_REPORT,
  ],

  [Role.ADMIN]: [
    Action.VIEW_POST,
    Action.VIEW_FEED,
    Action.VIEW_EXPLORE,
    Action.VIEW_REPLIES,

    Action.DELETE_POST,
    Action.REVIEW_REPORTS,
    Action.MANAGE_USERS,
    Action.VIEW_MODERATION_LOGS,
  ],
};
