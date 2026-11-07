"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ApiError } from "@webfudge/utils/api";
import { Alert, Button, Field, Input } from "@webfudge/ui/components";
import { useAuth } from "./AuthProvider";

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return "That email and password do not match. Check them and try again.";
    if (error.status === 403) return error.message;
    if (error.status === 429) return "Too many attempts. Wait a minute, then try again.";
    return error.message;
  }
  return "The server could not be reached. Check the connection and try again.";
}

export function LoginForm({ onSignedIn }: { onSignedIn: () => void }) {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(identifier.trim(), password);
      onSignedIn();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      {error && (
        <Alert tone="risk" title="Sign-in failed">
          {error}
        </Alert>
      )}
      <Field label="Email or username" htmlFor="login-identifier">
        <Input
          id="login-identifier"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />
      </Field>
      <Field label="Password" htmlFor="login-password">
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-ink"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!identifier || !password}>
        Sign in
      </Button>
    </form>
  );
}
