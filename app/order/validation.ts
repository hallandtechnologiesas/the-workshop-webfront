import { z } from 'zod';

import { MATERIAL_TYPES, OVERRIDE_KEYS, PRINT_PRESETS } from './types';

const overrideShape = OVERRIDE_KEYS.reduce(
  (shape, key) => {
    shape[key] = z.string();
    return shape;
  },
  {} as Record<(typeof OVERRIDE_KEYS)[number], z.ZodString>,
);

export const overrideSchema = z.object(overrideShape).strict();

export const configSchema = z.object({
  preset: z.enum(PRINT_PRESETS),
  overrides: overrideSchema,
  materialType: z.enum(MATERIAL_TYPES),
  materialColor: z.string(),
});

const fileSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().nonnegative(),
  config: configSchema,
});

export const createOrderSchema = z.object({
  files: z.array(fileSchema).min(1),
});

export const updateOrderSchema = z.object({
  orderId: z.string().uuid(),
  status: z.string().min(1),
});
