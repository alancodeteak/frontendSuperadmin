"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AtSignIcon, KeyRoundIcon } from "lucide-react";

import { AuthPage } from "@/components/ui/auth-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import { siteConfig } from "@/config/site";
import { ApiError } from "@/lib/api";
import { requestLoginCode, verifyLoginCode } from "@/lib/api/auth";
import { setSession } from "@/lib/auth-storage";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function sendCode() {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await requestLoginCode(email.trim());
      setStep("otp");
      setInfo(
        res.expires_in
          ? `Code sent to ${email.trim()}. Expires in ${res.expires_in}s.`
          : `Code sent to ${email.trim()}. Check your email (or admin-api logs in console mode).`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function onRequestCode(e: React.FormEvent) {
    e.preventDefault();
    await sendCode();
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verifyLoginCode(email.trim(), otp.trim());
      refresh();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  function goBackToEmail() {
    setStep("email");
    setOtp("");
    setError(null);
    setInfo(null);
  }

  return (
    <AuthPage
      title={step === "email" ? "Sign in" : "Verify your email"}
      description={
        step === "email"
          ? `Enter your email to receive a one-time code for ${siteConfig.name}.`
          : "Enter the one-time code we sent to continue."
      }
      onBack={step === "otp" ? goBackToEmail : undefined}
      backLabel="Use a different email"
    >
      {step === "email" ? (
        <form className="space-y-3" onSubmit={onRequestCode}>
          <p className="text-start text-xs text-muted-foreground">
            Enter your email address to sign in
          </p>
          <div className="relative h-max">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="h-10 peer ps-9"
              disabled={loading}
            />
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground peer-disabled:opacity-50">
              <AtSignIcon className="size-4" aria-hidden="true" />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Continue with Email"}
          </Button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={onVerify}>
          <p className="text-start text-xs text-muted-foreground">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-foreground">{email.trim()}</span>
          </p>
          <div className="relative h-max">
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              className="h-10 peer ps-9 tracking-[0.3em]"
              disabled={loading}
              autoFocus
            />
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground peer-disabled:opacity-50">
              <KeyRoundIcon className="size-4" aria-hidden="true" />
            </div>
          </div>
          {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Verifying…" : "Verify & continue"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={() => void sendCode()}
          >
            Resend code
          </Button>
        </form>
      )}

      {siteConfig.developmentMode ? (
        <div className="space-y-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setSession({
                access_token: "dev-skip-access",
                refresh_token: "dev-skip-refresh",
                email: email.trim() || "dev@localhost",
              });
              refresh();
              router.replace("/dashboard");
            }}
          >
            Skip login (dev mode)
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Development mode — screens use dummy data. Skip bypasses auth for UI
            work.
          </p>
        </div>
      ) : null}
    </AuthPage>
  );
}
