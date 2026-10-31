import { SetMetadata } from '@nestjs/common';

export const isPublicKey = 'isPublic';

/** Lets a handler or controller answer without a session. */
export const Public = () => SetMetadata(isPublicKey, true);
