import { clickMutations } from '@/libs/api/click-queries';
import { useMutation } from '@tanstack/react-query';

export const useClick = () => useMutation(clickMutations.click());
