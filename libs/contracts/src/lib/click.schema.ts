import { z } from 'zod';

/** Body of `POST /clicks`: one cookie click, counted as one request. */
export const clickResponseSchema = z.object({
  clickedAt: z.iso.datetime(),
});

export type ClickResponse = z.infer<typeof clickResponseSchema>;
