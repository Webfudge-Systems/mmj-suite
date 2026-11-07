"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@webfudge/auth/components";
import { Delete } from "lucide-react";
import { Alert, Button, Input, LoginLayout, Spinner } from "@webfudge/ui";
import { ApiError, apiRequest, type DeviceInfo } from "@webfudge/utils/api";
import { API_URL, forgetDevice, readDevice, saveDevice, type PairedDevice } from "@/lib/device";
import { FloorProvider } from "@/lib/floor";

/** A tablet left untouched this long locks itself, so the next customer never sees someone else's session. */
const IDLE_LOCK_MS = 10 * 60 * 1000;

type Person = { id: number; name: string; staffRole: string };

const FEATURES = [
  { value: "Every design", label: "with live prices" },
  { value: "Tray & rack", label: "for each piece" },
  { value: "One tap", label: "to the counter" },
];

function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-sunk">
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-lg">
        <Spinner className="text-navy" />
        <span className="font-medium text-ink">Loading</span>
      </div>
    </main>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
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
    <LoginLayout
      appName="Showroom"
      tagline="The collection, with today's prices, in the salesperson's hands."
      detail="Show customers every design in stock, see which tray it sits in, and send the chosen pieces to the billing counter as an estimate."
      features={FEATURES}
      heading="Pair this tablet"
      intro="The branch manager creates a six-digit code in the Back Office under Settings › Tablets. Type it here once."
    >
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <Input
          id="pair-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          className="h-16 text-center font-mono text-3xl tracking-[0.5em]"
          autoFocus
        />
        {error && <Alert tone="risk">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={code.length !== 6}>
          Pair
        </Button>
      </form>
    </LoginLayout>
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
    <LoginLayout
      appName="Showroom"
      tagline="The collection, with today's prices, in the salesperson's hands."
      detail="Show customers every design in stock, see which tray it sits in, and send the chosen pieces to the billing counter as an estimate."
      features={FEATURES}
      heading={person ? person.name : "Who is serving?"}
      intro={`${paired.device.name} · ${paired.device.branch.name}`}
    >
      {!person ? (
        <div className="grid gap-4">
          {error && <Alert tone="risk">{error}</Alert>}
          {!people ? (
            <Spinner />
          ) : people.length === 0 ? (
            <p className="text-ash">Nobody at this branch has a tablet PIN yet. The branch manager sets PINs in the Back Office under Settings › Staff.</p>
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
                  className="grid min-h-28 place-items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-4 text-center shadow-[var(--shadow-tile)] transition-all hover:border-navy-line hover:shadow-md active:bg-navy-soft"
                >
                  <span className="grid size-12 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-navy to-navy-deep text-sm font-bold text-gold shadow-lg">{initials(entry.name)}</span>
                  <span className="text-[15px] font-semibold text-ink">{entry.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid justify-items-center gap-6">
          <button type="button" className="justify-self-start text-sm font-medium text-navy hover:underline" onClick={() => setPerson(null)}>
            Not you? Choose someone else
          </button>
          <div className="flex gap-3" aria-label={`${pin.length} digits entered`}>
            {Array.from({ length: Math.max(4, pin.length) }, (_, index) => (
              <span key={index} className={`size-4 rounded-full ${index < pin.length ? "bg-navy" : "bg-gray-200"}`} />
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
                  className="grid size-20 place-items-center rounded-full border border-gray-200 bg-white text-2xl font-semibold text-ink shadow-md transition-colors hover:bg-gray-50 active:bg-navy active:text-white"
                  aria-label={key === "⌫" ? "Delete" : key}
                >
                  {key === "⌫" ? <Delete className="size-6" aria-hidden /> : key}
                </button>
              ) : (
                <span key={index} />
              ),
            )}
          </div>
          <Button size="lg" className="w-full max-w-xs" loading={busy} disabled={pin.length < 4} onClick={() => submit(pin)}>
            Sign in
          </Button>
        </div>
      )}
    </LoginLayout>
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
      <Loading />
    );
  }
  if (!paired) return <PairScreen onPaired={setPaired} />;
  if (status !== "signed_in") return <PinScreen paired={paired} onUnpaired={unpair} />;
  return <FloorProvider device={paired.device}>{children}</FloorProvider>;
}
