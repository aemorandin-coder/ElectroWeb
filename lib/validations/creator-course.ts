// Lo que un creador puede escribir en su curso (C-72). Todo lo demás (dueño, estado, destacado, inscritos,
// calificación, slug) lo decide el servidor o el admin.
import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform((value) => value || null);
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === '' || /^https?:\/\/[^\s]+$/i.test(value) || /^\/(?!\/)[^\s]*$/.test(value), 'Enlace inválido')
  .nullable()
  .optional()
  .transform((value) => value || null);

export const creatorCourseSchema = z.object({
  title: z.string().trim().min(3, 'El título es muy corto').max(150),
  shortDesc: optionalText(300),
  description: z.string().trim().min(10, 'La descripción es muy corta').max(20000),
  trailerUrl: optionalUrl,
  category: optionalText(40),
  level: optionalText(40),
  priceUSD: z.coerce.number({ error: 'Precio inválido' }).min(0, 'El precio no puede ser negativo').max(10000),
  thumbnail: optionalUrl,
});

export const creatorCoursePatchSchema = creatorCourseSchema.partial();

const lessonSchema = z.object({
  id: z.string().max(40).optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  videoUrl: optionalUrl,
  duration: z.union([z.string(), z.number()]).nullable().optional(),
  isFree: z.boolean().optional(),
  order: z.coerce.number().int().min(0).max(1000).optional(),
});

export const curriculumSchema = z
  .array(
    z.object({
      id: z.string().max(40).optional(),
      title: z.string().trim().min(1).max(200),
      order: z.coerce.number().int().min(0).max(1000).optional(),
      lessons: z.array(lessonSchema).max(200).optional(),
    })
  )
  .max(50);
