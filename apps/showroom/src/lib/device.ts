import type { DeviceInfo } from "@webfudge/utils/api";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1337";

const KEY = "mmj.showroom.device";

export type PairedDevice = { token: string; device: DeviceInfo };

/** The pairing saved on this tablet, if any. */
export function readDevice(): PairedDevice | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PairedDevice) : null;
  } catch {
    return null;
  }
}

export function saveDevice(paired: PairedDevice) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(paired));
  } catch {
    // Without storage the tablet must be paired again after a reload.
  }
}

export function forgetDevice() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}

/** Uploaded photos come back as paths on the backend. */
export function mediaUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${API_URL}${url}`;
}
