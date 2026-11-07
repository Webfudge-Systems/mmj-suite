"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gem, Hand, ShoppingBag } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { LiveRateBoard, MmjMark, ProfileMenu, ProductBranding, cn } from "@webfudge/ui";
import { API_URL } from "@/lib/device";
import { useFloor } from "@/lib/floor";

export function Header() {
  const pathname = usePathname();
  const { staff, signOut } = useAuth();
  const { device, customer, tray, clearSession } = useFloor();

  const tab = (href: string, label: string, Icon: typeof Gem, badge?: number) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-11 items-center gap-2 rounded-lg border px-4 text-[14px] font-semibold whitespace-nowrap transition-all duration-200",
          active ? "border-transparent bg-navy text-white shadow-lg" : "border-gray-100 bg-white text-gray-700 shadow-sm hover:shadow-md",
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
        {label}
        {badge ? (
          <span className={cn("grid min-w-6 place-items-center rounded-full px-1.5 text-[12px] font-bold", active ? "bg-gold text-navy-deep" : "bg-navy text-white")}>
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <MmjMark className="h-11 w-auto shrink-0" />
          <ProductBranding appName="Showroom" className="hidden sm:grid" />
        </Link>
        <nav className="flex flex-1 flex-wrap items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/70 p-1.5 sm:justify-start" aria-label="Showroom">
          {tab("/", "Collection", Gem)}
          {tab("/tray", customer ? `${customer.name.split(" ")[0]}'s tray` : "Customer's tray", ShoppingBag, tray.length)}
          {tab("/mine", "In my hands", Hand)}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-right text-[12px] leading-tight text-ash lg:block">
            {device.name}
            <span className="block font-semibold text-navy">{device.branch.name}</span>
          </span>
          {staff && (
            <ProfileMenu
              name={staff.fullName || staff.username}
              role="Signed in on this tablet"
              detail={`${device.name} · ${device.branch.name}`}
              onSignOut={() => {
                clearSession();
                signOut();
              }}
            />
          )}
        </div>
      </div>
      <div className="border-t border-gray-100 bg-gray-50/80">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
          <LiveRateBoard apiUrl={API_URL} variant="strip" only={["24KT", "22KT", "18KT", "999"]} />
        </div>
      </div>
    </header>
  );
}
