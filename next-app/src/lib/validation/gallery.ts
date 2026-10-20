import { z } from "zod";

export const galleryImageSchema = z.object({
  order: z.coerce.number().int().min(0).max(10000).default(0),
});

export const galleryOrderSchema = z.object({
  order: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        order: z.coerce.number().int().min(0).max(10000),
      }),
    )
    .min(1),
});
