"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validation";
import { AuthField } from "@/components/auth/AuthField";
import { NickMark } from "@/components/auth/NickMark";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const callbackError = params.get("error");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      setErrors({ form: error.message });
      setPending(false);
      return;
    }
    router.replace(params.get("next") ?? "/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <NickMark />
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@club.com"
          error={errors.email}
        />
        <AuthField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password}
        />
        {errors.form ? (
          <p className="text-center text-[13px] font-medium text-coral">{errors.form}</p>
        ) : null}
        {callbackError ? (
          <p className="text-center text-[13px] font-medium text-coral">
            That sign-in link didn’t work — try again or sign in with your password.
          </p>
        ) : null}
        <Button type="submit" size="lg" loading={pending}>
          Sign In
        </Button>
      </form>
      <p className="text-center text-[15px] text-ink-2">
        New to Nick?{" "}
        <Link href="/signup" className="font-semibold text-cobalt">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
