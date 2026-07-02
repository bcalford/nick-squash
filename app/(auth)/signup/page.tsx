"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validation";
import { AuthField } from "@/components/auth/AuthField";
import { NickMark } from "@/components/auth/NickMark";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
      displayName: form.get("displayName"),
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
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: parsed.data.displayName },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    setPending(false);
    if (error) {
      setErrors({ form: error.message });
      return;
    }
    setSentTo(parsed.data.email);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="text-5xl">📬</span>
        <h1 className="text-[22px] font-bold">Check your email</h1>
        <p className="text-[15px] leading-snug text-ink-2">
          We sent a confirmation link to <strong>{sentTo}</strong>. Tap it to
          activate your account, then come back to set up your player profile.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <NickMark />
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <AuthField
          label="Name"
          name="displayName"
          autoComplete="name"
          placeholder="Ramy Ashour"
          error={errors.displayName}
        />
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
          autoComplete="new-password"
          placeholder="8+ characters"
          error={errors.password}
        />
        {errors.form ? (
          <p className="text-center text-[13px] font-medium text-coral">{errors.form}</p>
        ) : null}
        <Button type="submit" size="lg" loading={pending}>
          Create Account
        </Button>
      </form>
      <p className="text-center text-[15px] text-ink-2">
        Already playing?{" "}
        <Link href="/login" className="font-semibold text-cobalt">
          Sign in
        </Link>
      </p>
    </div>
  );
}
