import { SetMetadata } from '@nestjs/common';
import type { Role } from '@ratewatch/contracts';

export const rolesKey = 'roles';

/** Answers 403 to anyone signed in with another role. Without it, a route is open to every signed-in role. */
export const Roles = (...roles: Role[]) => SetMetadata(rolesKey, roles);
