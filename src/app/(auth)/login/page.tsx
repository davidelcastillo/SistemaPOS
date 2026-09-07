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
 * Flat design per .STYLES.md: 1px borders, 2px radius, accent focus ring,
 * no shadows.
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
    <main className="flex flex-1 items-center justify-center px-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm border border-neutral-300 bg-white p-8"
      >
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
          Iniciar sesión
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Ingresá con tu cuenta para operar el sistema.
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={`mt-1 w-full rounded-[2px] border bg-white px-3 py-2 text-base text-neutral-900 outline-none transition-colors focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2 ${
                errors.email ? "border-red-500" : "border-neutral-300"
              }`}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700"
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
              className={`mt-1 w-full rounded-[2px] border bg-white px-3 py-2 text-base text-neutral-900 outline-none transition-colors focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2 ${
                errors.password ? "border-red-500" : "border-neutral-300"
              }`}
              {...register("password")}
            />
            {errors.password && (
              <p id="password-error" className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        {authError && (
          <p role="alert" className="mt-6 text-sm text-red-600">
            {authError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-8 w-full bg-[#0066FF] px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-[#0052CC] active:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}