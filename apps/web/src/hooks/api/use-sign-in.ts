import { sessionMutations } from '@/libs/api/session-queries';
import { useMutation } from '@tanstack/react-query';

export const useSignIn = () => useMutation(sessionMutations.signIn());
