"use client";

import { useState, type ChangeEvent } from "react";
import { Camera, FileText, Paperclip, X } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { Spinner, cn } from "@webfudge/ui";
import { ApiError, type FileRef } from "@webfudge/utils/api";
import { errorMessage } from "@/lib/api";
import { API_URL, mediaUrl } from "@/lib/env";
import { shrink } from "./photos";

/** Most files per receipt; the server enforces the same limit. */
export const MAX_ATTACHMENTS = 10;
const MAX_BYTES = 15 * 1024 * 1024;

function size(bytes: number | null) {
  if (bytes === null) return "";
  // Strapi stores file sizes in kilobytes.
  if (bytes < 1) return "under 1 KB";
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} MB` : `${Math.round(bytes)} KB`;
}

/** Uploads bills and challans (photos or PDFs) to the media library. Photos are shrunk first. */
export function useUploadFiles() {
  const { withToken } = useAuth();
  return async (files: File[]): Promise<FileRef[]> => {
    const prepared = await Promise.all(files.map((file) => (file.type.startsWith("image/") ? shrink(file) : Promise.resolve(file))));
    const uploaded = await withToken(async (token) => {
      const form = new FormData();
      for (const file of prepared) form.append("files", file);
      const response = await fetch(`${API_URL}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!response.ok) throw new ApiError("The files could not be uploaded.", response.status);
      return (await response.json()) as { id: number; name: string; url: string; mime: string; size: number; formats?: { thumbnail?: { url: string } } }[];
    });
    return uploaded.map((file) => ({
      id: file.id,
      name: file.name,
      url: file.url,
      mime: file.mime,
      size: file.size,
      thumbnailUrl: file.mime?.startsWith("image/") ? (file.formats?.thumbnail?.url ?? file.url) : null,
    }));
  };
}

/**
 * The supplier's bill or delivery challan: photograph it with the camera or pick
 * a photo or PDF. Files open in a new tab.
 */
export function Attachments({ id, files, onChange, disabled }: { id: string; files: FileRef[]; onChange: (files: FileRef[]) => void; disabled?: boolean }) {
  const upload = useUploadFiles();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const room = MAX_ATTACHMENTS - files.length;

  async function add(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!picked.length) return;
    setError(null);
    const wrong = picked.find((file) => !file.type.startsWith("image/") && file.type !== "application/pdf");
    if (wrong) return setError(`${wrong.name} is not a photo or a PDF.`);
    const large = picked.find((file) => file.type === "application/pdf" && file.size > MAX_BYTES);
    if (large) return setError(`${large.name} is larger than 15 MB.`);
    setBusy(true);
    try {
      onChange([...files, ...(await upload(picked.slice(0, room)))]);
      if (picked.length > room) setError(`Only ${MAX_ATTACHMENTS} files fit on one receipt.`);
    } catch (cause) {
      setError(errorMessage(cause, "The files could not be uploaded."));
    } finally {
      setBusy(false);
    }
  }

  const button = "relative inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-white px-3 text-[13px] font-semibold text-gray-700 transition-colors hover:border-navy hover:text-navy";

  return (
    <div className="grid gap-2">
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((file) => (
            <li key={file.id} className="group relative flex max-w-64 items-center gap-2 rounded-lg border border-gray-200 bg-white p-1.5 pr-8 shadow-sm">
              <a href={mediaUrl(file.url)} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2">
                {file.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(file.thumbnailUrl)} alt="" className="size-10 shrink-0 rounded object-cover" />
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded bg-risk-soft text-risk">
                    <FileText className="size-5" aria-hidden />
                  </span>
                )}
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate text-[13px] font-semibold text-ink hover:underline">{file.name}</span>
                  <span className="text-[11.5px] text-ash">{[file.mime === "application/pdf" ? "PDF" : "Photo", size(file.size)].filter(Boolean).join(" · ")}</span>
                </span>
              </a>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(files.filter((entry) => entry.id !== file.id))}
                  className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-risk"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && room > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className={cn(button, busy && "pointer-events-none opacity-60")}>
            <Camera className="size-4" aria-hidden />
            Photograph the bill
            <input id={`${id}-camera`} type="file" accept="image/*" capture="environment" className="sr-only" onChange={add} disabled={busy} />
          </label>
          <label className={cn(button, busy && "pointer-events-none opacity-60")}>
            <Paperclip className="size-4" aria-hidden />
            Attach photo or PDF
            <input id={`${id}-files`} type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={add} disabled={busy} />
          </label>
          {busy && <Spinner className="size-4 text-navy" />}
        </div>
      )}
      {error && <p className="text-[12.5px] text-risk">{error}</p>}
    </div>
  );
}
