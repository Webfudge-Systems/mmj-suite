"use client";

// Same photo strip as the Back Office (apps/inventory/src/components/photos.tsx), for order photos at the counter.

import { useState, type ChangeEvent } from "react";
import { Camera, Gem, ImagePlus, Star, X } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { Spinner, cn } from "@webfudge/ui";
import { ApiError, type ImageRef, type StockItem } from "@webfudge/utils/api";
import { errorMessage } from "@webfudge/auth/components";
import { API_URL, mediaUrl } from "@/lib/env";

/** Most photos per piece; the server enforces the same limit. */
export const MAX_PHOTOS = 8;

/** Longest side, in pixels, that photos are shrunk to before upload. Plenty for tablets and the website. */
const MAX_SIDE = 1600;

/**
 * Phone photos are often 5–10 MB. Shrinking them first keeps uploads quick on
 * the shop's 4G backup. Falls back to the original file when the browser
 * cannot read it (for example some HEIC photos).
 */
export async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Uploads photos to the media library and returns them as ImageRefs. */
export function useUploadPhotos() {
  const { withToken } = useAuth();
  return async (files: File[]): Promise<ImageRef[]> => {
    const prepared = await Promise.all(files.map(shrink));
    const uploaded = await withToken(async (token) => {
      const form = new FormData();
      for (const file of prepared) form.append("files", file);
      const response = await fetch(`${API_URL}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!response.ok) throw new ApiError("The photos could not be uploaded.", response.status);
      return (await response.json()) as { id: number; url: string; formats?: { thumbnail?: { url: string } } }[];
    });
    return uploaded.map((file) => ({ id: file.id, url: file.url, thumbnailUrl: file.formats?.thumbnail?.url ?? file.url, alternativeText: null }));
  };
}

type PhotoStripProps = {
  id: string;
  photos: ImageRef[];
  onChange: (photos: ImageRef[]) => void;
  disabled?: boolean;
  /** Smaller thumbnails, for rows on the receive screen. */
  compact?: boolean;
};

/**
 * A piece's photos: take one with the camera or pick from the gallery, tap a
 * photo to make it the main one, remove with the cross. The first photo is the
 * one the tablets and lists show.
 */
export function PhotoStrip({ id, photos, onChange, disabled, compact }: PhotoStripProps) {
  const upload = useUploadPhotos();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const room = MAX_PHOTOS - photos.length;
  const size = compact ? "size-16" : "size-24";

  async function add(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, room);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError(null);
    try {
      onChange([...photos, ...(await upload(files))]);
    } catch (cause) {
      setError(errorMessage(cause, "The photos could not be uploaded."));
    } finally {
      setBusy(false);
    }
  }

  const pickClass = cn(
    "flex shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-[11px] font-semibold text-gray-600 transition-colors hover:border-navy hover:bg-navy-soft hover:text-navy",
    size,
    (disabled || busy || room <= 0) && "pointer-events-none opacity-50",
  );

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {photos.map((photo, index) => (
          <div key={photo.id} className={cn("group relative shrink-0 overflow-hidden rounded-xl border bg-white", size, index === 0 ? "border-gold ring-2 ring-gold/40" : "border-gray-200")}>
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => onChange([photo, ...photos.filter((other) => other.id !== photo.id)])}
              className="size-full"
              title={index === 0 ? "Main photo" : "Make this the main photo"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(photo.thumbnailUrl)} alt={`Photo ${index + 1}`} className="size-full object-cover" />
            </button>
            {index === 0 && (
              <span className="pointer-events-none absolute bottom-1 left-1 flex items-center gap-0.5 rounded-md bg-gold px-1 py-0.5 text-[9px] font-bold text-navy-deep">
                <Star className="size-2.5 fill-current" aria-hidden />
                Main
              </span>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(photos.filter((other) => other.id !== photo.id))}
                className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white opacity-90 transition-opacity hover:bg-black/80"
                aria-label={`Remove photo ${index + 1}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        ))}

        {busy && (
          <span className={cn("grid shrink-0 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-navy", size)}>
            <Spinner className="size-5" label="Uploading photos" />
          </span>
        )}

        {room > 0 && (
          <>
            <label className={pickClass} htmlFor={`${id}-camera`}>
              <Camera className="size-5" aria-hidden />
              {!compact && "Take photo"}
              <input id={`${id}-camera`} aria-label="Take a photo" type="file" accept="image/*" capture="environment" className="sr-only" onChange={add} disabled={disabled || busy} />
            </label>
            <label className={pickClass} htmlFor={`${id}-files`}>
              <ImagePlus className="size-5" aria-hidden />
              {!compact && "Upload"}
              <input id={`${id}-files`} aria-label="Upload photos" type="file" accept="image/*" multiple className="sr-only" onChange={add} disabled={disabled || busy} />
            </label>
          </>
        )}
      </div>
      {error && <p className="text-[12.5px] text-risk">{error}</p>}
    </div>
  );
}

/**
 * Small square photo for lists: the piece's main photo, else its design's photo
 * (marked with a small "D"), else a gem placeholder.
 */
export function PieceThumb({ item, className }: { item: Pick<StockItem, "photos" | "design" | "tagNumber">; className?: string }) {
  const own = item.photos?.[0];
  const image = own ?? item.design?.image ?? null;
  return (
    <span className={cn("relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-gray-300", className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(image.thumbnailUrl)} alt={item.design?.name ?? item.tagNumber} className="size-full object-cover" loading="lazy" />
      ) : (
        <Gem className="size-5" aria-hidden />
      )}
      {!own && image && (
        <span className="absolute right-0.5 bottom-0.5 rounded bg-white/90 px-1 text-[8px] font-bold text-ash" title="Design photo, not this piece">
          D
        </span>
      )}
    </span>
  );
}
