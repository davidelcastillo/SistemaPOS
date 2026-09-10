import { z } from "zod";

/**
 * Auth module data contract — user registration borders (HU-1.1).
 *
 * Validation runs BEFORE any database access; email uniqueness is enforced
 * by the database (`User.email` @unique) and mapped to `DUPLICATE_EMAIL`
 * by the caller. The role union matches the lowercase Prisma enum.
 */
export const registerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.email("Ingresá un email válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  role: z.enum(["admin", "cashier"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;