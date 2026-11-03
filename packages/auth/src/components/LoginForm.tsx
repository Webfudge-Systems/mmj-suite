"use client";

import { useState, type FormEvent } from "react";
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
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {error && <Alert tone="risk">{error}</Alert>}
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
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
      <Button type="submit" size="lg" loading={busy} disabled={!identifier || !password}>
        Sign in
      </Button>
    </form>
  );
}
