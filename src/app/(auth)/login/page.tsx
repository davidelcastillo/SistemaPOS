"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

/**
 * Login page — reactive credentials form (HU-1.1, R-5).
 *
 * react-hook-form + zodResolver(loginSchema) validate before any network
 * call; signIn("credentials", { redirect: false }) keeps the page in control
 * of loading/error state. On success the user is pushed to the callbackUrl
 * when present, otherwise to /dashboard (same session destination the root
 * page.tsx redirects to). The role-based destination matrix is HU-1.2.
 *
 * Design per STYLES.md: cream canvas #f5f1ec, white card with hairline
 * border, charcoal #111111 as system primary (inputs focus ring + button),
 * semantic-error #c41c1c, rounded-md 8px on controls, no shadows.
 */
export default function LoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setAuthError(null);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setAuthError("Credenciales inválidas");
      return;
    }

    // Read the callback only at submit time (Next.js docs pattern) so the
    // page stays Suspense-free.
    const callbackUrl =
      new URLSearchParams(window.location.search).get("callbackUrl") ??
      "/dashboard";
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-[#f5f1ec] px-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm rounded-[12px] border border-[#d3cec6] bg-white p-6 sm:p-8"
      >
        <h1 className="text-[28px] font-medium leading-[1.2] tracking-[-0.5px] text-[#111111]">
          Iniciar sesión
        </h1>
        <p className="mt-2 text-sm leading-[1.5] text-[#626260]">
          Ingresá con tu cuenta para operar el sistema.
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#111111]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={`mt-1 w-full rounded-[8px] border bg-white px-3.5 py-2.5 text-base text-[#111111] outline-none transition-colors focus:border-[#111111] focus:ring-1 focus:ring-[#111111] ${
                errors.email ? "border-[#c41c1c]" : "border-[#d3cec6]"
              }`}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-[#c41c1c]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#111111]"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? "password-error" : undefined
              }
              className={`mt-1 w-full rounded-[8px] border bg-white px-3.5 py-2.5 text-base text-[#111111] outline-none transition-colors focus:border-[#111111] focus:ring-1 focus:ring-[#111111] ${
                errors.password ? "border-[#c41c1c]" : "border-[#d3cec6]"
              }`}
              {...register("password")}
            />
            {errors.password && (
              <p id="password-error" className="mt-1 text-sm text-[#c41c1c]">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        {authError && (
          <p role="alert" className="mt-6 text-sm text-[#c41c1c]">
            {authError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-8 w-full rounded-[8px] bg-[#111111] px-4 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}