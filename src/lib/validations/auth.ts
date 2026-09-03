import { z } from "zod";

/**
 * Auth shared contract — login borders (HU-1.1).
 *
 * Password min(1) produces the "Credenciales inválidas" border; email
 * validation is descriptive and actionable.
 */
export const loginSchema = z.object({
  email: z.email("Ingresá un email válido"),
  password: z.string().min(1, "Credenciales inválidas"),
});

export type LoginInput = z.infer<typeof loginSchema>;