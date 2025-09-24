import { z } from "zod";

export const orderIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
