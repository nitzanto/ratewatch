import { sessionMutations } from './session-queries';
import { useMutation } from '@tanstack/react-query';

export const useSignOut = () => useMutation(sessionMutations.signOut());
