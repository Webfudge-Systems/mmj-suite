"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@webfudge/auth/components";
import { LiveRateBoard, cn } from "@webfudge/ui";
import { API_URL } from "@/lib/device";
import { useFloor } from "@/lib/floor";

export function Header() {
  const pathname = usePathname();
  const { staff, signOut } = useAuth();
  const { device, customer, tray, clearSession } = useFloor();

  const tab = (href: string, label: string, badge?: number) => (
    <Link
      href={href}
      className={cn(
        "flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors",
        pathname === href ? "bg-paper text-navy-deep" : "text-paper/85 hover:bg-paper/10",
      )}
    >
      {label}
      {badge ? <span className="grid min-w-6 place-items-center rounded-full bg-gold px-1.5 text-[12px] text-navy-deep">{badge}</span> : null}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 bg-navy-deep text-paper">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-lg bg-gold text-[13px] font-bold text-navy-deep">MMJ</span>
          <span className="hidden text-[13px] leading-tight text-paper/70 sm:block">
            {device.branch.name}
            <span className="block text-paper">Mukund Maid Jewellers</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1" aria-label="Showroom">
          {tab("/", "Collection")}
          {tab("/tray", customer ? `${customer.name.split(" ")[0]}'s tray` : "Customer's tray", tray.length)}
          {tab("/mine", "In my hands")}
        </nav>
        <div className="flex items-center gap-3 text-[13px]">
          <span className="text-paper/70">{staff?.fullName || staff?.username}</span>
          <button
            type="button"
            onClick={() => {
              clearSession();
              signOut();
            }}
            className="h-11 rounded-full border border-paper/25 px-4 font-semibold hover:bg-paper/10"
          >
            Switch
          </button>
        </div>
      </div>
      <div className="border-t border-paper/10 bg-navy-deep/95">
        <div className="mx-auto max-w-7xl px-4 py-1.5 text-paper/80 sm:px-6 [&_span]:text-paper/80 [&_.font-semibold]:text-paper">
          <LiveRateBoard apiUrl={API_URL} variant="strip" only={["24KT", "22KT", "18KT", "999"]} />
        </div>
      </div>
    </header>
  );
}
