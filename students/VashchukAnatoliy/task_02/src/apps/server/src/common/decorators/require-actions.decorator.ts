import { SetMetadata } from '@nestjs/common';
import { Action } from '../enums/action.enum';

export const REQUIRE_ACTIONS_KEY = 'require_actions';

export const RequireActions = (...actions: Action[]) => SetMetadata(REQUIRE_ACTIONS_KEY, actions);
