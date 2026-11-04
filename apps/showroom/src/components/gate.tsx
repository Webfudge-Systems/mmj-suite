"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Button, Input, Spinner, Wordmark } from "@webfudge/ui";
import { ApiError, apiRequest, type DeviceInfo } from "@webfudge/utils/api";
import { API_URL, forgetDevice, readDevice, saveDevice, type PairedDevice } from "@/lib/device";
import { FloorProvider } from "@/lib/floor";

/** A tablet left untouched this long locks itself, so the next customer never sees someone else's session. */
const IDLE_LOCK_MS = 10 * 60 * 1000;

type Person = { id: number; name: string; staffRole: string };

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-navy-deep px-6 py-10 text-paper">
      <div className="grid w-full max-w-xl gap-8">{children}</div>
    </main>
  );
}

function PairScreen({ onPaired }: { onPaired: (paired: PairedDevice) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await apiRequest<{ data: { token: string; device: DeviceInfo } }>(API_URL, "/floor/pair", { method: "POST", body: { code } });
      const paired = { token: data.token, device: data.device };
      saveDevice(paired);
      onPaired(paired);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "The server could not be reached. Check the Wi-Fi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Wordmark appName="Showroom" />
      <form onSubmit={submit} className="grid gap-4 rounded-[var(--radius-panel)] bg-surface p-6 text-ink" noValidate>
        <h1 className="text-xl font-semibold text-navy">Pair this tablet</h1>
        <p className="text-sm text-ash">The branch manager creates a six-digit code in the Back Office under Settings › Tablets. Type it here once.</p>
        <Input
          id="pair-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          className="h-14 text-center font-mono text-3xl tracking-[0.5em]"
          autoFocus
        />
        {error && <Alert tone="risk">{error}</Alert>}
        <Button type="submit" size="lg" loading={busy} disabled={code.length !== 6}>
          Pair
        </Button>
      </form>
    </Screen>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

function PinScreen({ paired, onUnpaired }: { paired: PairedDevice; onUnpaired: () => void }) {
  const { signInWithToken } = useAuth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ data: { people: Person[] } }>(API_URL, "/floor/people", { init: { headers: { "X-Device-Token": paired.token } } })
      .then(({ data }) => active && setPeople(data.people))
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) onUnpaired();
        else setError(cause instanceof ApiError ? cause.message : "The server could not be reached. Check the Wi-Fi.");
      });
    return () => {
      active = false;
    };
  }, [paired, onUnpaired]);

  async function submit(value: string) {
    if (!person) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/floor/pin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Device-Token": paired.token },
        body: JSON.stringify({ userId: person.id, pin: value }),
      });
      const body = await response.json();
      if (!response.ok) throw new ApiError(body?.error?.message ?? "Sign-in failed.", response.status);
      await signInWithToken(body.jwt);
    } catch (cause) {
      setPin("");
      setError(cause instanceof ApiError ? cause.message : "The server could not be reached. Check the Wi-Fi.");
    } finally {
      setBusy(false);
    }
  }

  function press(key: string) {
    if (busy) return;
    if (key === "⌫") return setPin((value) => value.slice(0, -1));
    if (!key) return;
    const next = (pin + key).slice(0, 6);
    setPin(next);
    if (next.length >= 4 && next.length === 6) submit(next);
  }

  return (
    <Screen>
      <div className="flex items-center justify-between gap-4">
        <Wordmark appName="Showroom" />
        <span className="text-right text-[13px] text-paper/70">{paired.device.name} · {paired.device.branch.name}</span>
      </div>

      {!person ? (
        <div className="grid gap-4">
          <h1 className="text-2xl font-semibold">Who is serving?</h1>
          {error && <Alert tone="risk">{error}</Alert>}
          {!people ? (
            <Spinner />
          ) : people.length === 0 ? (
            <p className="text-paper/70">Nobody at this branch has a tablet PIN yet. The branch manager sets PINs in the Back Office under Settings › Staff.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {people.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setPerson(entry);
                    setPin("");
                    setError(null);
                  }}
                  className="grid min-h-24 place-items-center rounded-[var(--radius-panel)] bg-paper/10 px-3 text-center text-lg font-semibold transition-colors hover:bg-paper/20"
                >
                  {entry.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid justify-items-center gap-6">
          <div className="grid justify-items-center gap-1">
            <h1 className="text-2xl font-semibold">{person.name}</h1>
            <button type="button" className="text-sm text-paper/70 underline" onClick={() => setPerson(null)}>
              Not you?
            </button>
          </div>
          <div className="flex gap-3" aria-label={`${pin.length} digits entered`}>
            {Array.from({ length: Math.max(4, pin.length) }, (_, index) => (
              <span key={index} className={`size-4 rounded-full ${index < pin.length ? "bg-gold" : "bg-paper/25"}`} />
            ))}
          </div>
          {error && <Alert tone="risk">{error}</Alert>}
          <div className="grid grid-cols-3 gap-3">
            {KEYS.map((key, index) =>
              key ? (
                <button
                  key={index}
                  type="button"
                  onClick={() => press(key)}
                  className="size-20 rounded-full bg-paper/10 text-2xl font-semibold transition-colors hover:bg-paper/20 active:bg-paper/30"
                  aria-label={key === "⌫" ? "Delete" : key}
                >
                  {key}
                </button>
              ) : (
                <span key={index} />
              ),
            )}
          </div>
          <Button variant="gold" size="lg" className="w-56" loading={busy} disabled={pin.length < 4} onClick={() => submit(pin)}>
            Sign in
          </Button>
        </div>
      )}
    </Screen>
  );
}

/**
 * Everything on the tablet sits behind this: pair once, then each salesperson
 * signs in with their PIN. Idle tablets lock themselves.
 */
export function Gate({ children }: { children: ReactNode }) {
  const { status, signOut } = useAuth();
  const [paired, setPaired] = useState<PairedDevice | null | undefined>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => setPaired(readDevice()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const unpair = useCallback(() => {
    forgetDevice();
    setPaired(null);
  }, []);

  useEffect(() => {
    if (status !== "signed_in") return;
    let timer = window.setTimeout(signOut, IDLE_LOCK_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(signOut, IDLE_LOCK_MS);
    };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    for (const name of events) window.addEventListener(name, reset, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const name of events) window.removeEventListener(name, reset);
    };
  }, [status, signOut]);

  if (paired === undefined || status === "loading") {
    return (
      <Screen>
        <Spinner />
      </Screen>
    );
  }
  if (!paired) return <PairScreen onPaired={setPaired} />;
  if (status !== "signed_in") return <PinScreen paired={paired} onUnpaired={unpair} />;
  return <FloorProvider device={paired.device}>{children}</FloorProvider>;
}
