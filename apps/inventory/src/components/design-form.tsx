"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@webfudge/auth/components";
import { PURITIES } from "@webfudge/config";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, Select, Textarea } from "@webfudge/ui";
import { ApiError, type Category, type Design, type MakingCharge } from "@webfudge/utils/api";
import { MakingInput } from "@/components/pickers";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { API_URL, mediaUrl } from "@/lib/env";

type Image = Design["images"][number];

const OCCASIONS = [
  ["", "Not set"],
  ["bridal", "Bridal"],
  ["festive", "Festive"],
  ["daily", "Daily wear"],
  ["gifting", "Gifting"],
  ["mens", "Men's"],
];

export function DesignForm({ design }: { design?: Design }) {
  const router = useRouter();
  const api = useApi();
  const { withToken, hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager", "stock_keeper");
  const categories = useResource<{ data: Category[] }>("/stock/categories");

  const [name, setName] = useState(design?.name ?? "");
  const [code, setCode] = useState(design?.code ?? "");
  const [categoryId, setCategoryId] = useState(design?.category?.id ? String(design.category.id) : "");
  const [metal, setMetal] = useState<string>(design?.metal ?? "gold");
  const [purity, setPurity] = useState<string>(design?.defaultPurity ?? "22KT");
  const [making, setMaking] = useState<MakingCharge | null>(design?.making ?? { type: "per_gram", value: 0 });
  const [occasion, setOccasion] = useState(design?.occasion ?? "");
  const [description, setDescription] = useState(design?.description ?? "");
  const [isOnline, setIsOnline] = useState(design?.isOnline ?? false);
  const [isActive, setIsActive] = useState(design?.isActive ?? true);
  const [images, setImages] = useState<Image[]>(design?.images ?? []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const purities = PURITIES.filter((entry) => entry.metal === metal);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await withToken(async (token) => {
        const form = new FormData();
        for (const file of Array.from(files)) form.append("files", file);
        const response = await fetch(`${API_URL}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
        if (!response.ok) throw new ApiError("The photos could not be uploaded.", response.status);
        return (await response.json()) as { id: number; url: string; formats?: { thumbnail?: { url: string } } }[];
      });
      setImages((current) => [
        ...current,
        ...uploaded.map((file) => ({ id: file.id, url: file.url, thumbnailUrl: file.formats?.thumbnail?.url ?? file.url, alternativeText: null })),
      ]);
    } catch (cause) {
      setError(errorMessage(cause, "The photos could not be uploaded."));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const body = {
      name,
      code: code.trim() || undefined,
      categoryId: Number(categoryId) || undefined,
      metal,
      defaultPurity: purity,
      making,
      occasion: occasion || null,
      description,
      isOnline,
      isActive,
      imageIds: images.map((image) => image.id),
    };
    try {
      const result = design
        ? await api.put<{ data: Design }>(`/stock/designs/${design.id}`, body)
        : await api.post<{ data: Design }>("/stock/designs", body);
      if (design) {
        setCode(result.data.code);
        setSaved(true);
      } else {
        router.replace(`/catalogue/${result.data.id}`);
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <Card>
        <CardHeader title="Details" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Design name" htmlFor="design-name" className="sm:col-span-2">
            <Input id="design-name" value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Category" htmlFor="design-category">
            <Select id="design-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={!canEdit}>
              <option value="">Choose a category</option>
              {categories.data?.data.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} {category.code ? `(${category.code})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Design number" htmlFor="design-code" hint={design ? undefined : "Leave empty to number it automatically, like D-NK-0001."}>
            <Input id="design-code" value={code} onChange={(event) => setCode(event.target.value)} className="font-mono uppercase" disabled={!canEdit} />
          </Field>
          <Field label="Metal" htmlFor="design-metal">
            <Select
              id="design-metal"
              value={metal}
              onChange={(event) => {
                setMetal(event.target.value);
                setPurity(PURITIES.find((entry) => entry.metal === event.target.value)?.code ?? "");
              }}
              disabled={!canEdit}
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="platinum">Platinum</option>
            </Select>
          </Field>
          <Field label="Usual purity" htmlFor="design-purity">
            <Select id="design-purity" value={purity} onChange={(event) => setPurity(event.target.value)} disabled={!canEdit}>
              {purities.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Making charge" htmlFor="design-making" hint="Copied to each piece received. Can be changed per piece.">
            <MakingInput id="design-making" value={making} onChange={setMaking} />
          </Field>
          <Field label="Occasion" htmlFor="design-occasion">
            <Select id="design-occasion" value={occasion} onChange={(event) => setOccasion(event.target.value)} disabled={!canEdit}>
              {OCCASIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" htmlFor="design-description" className="sm:col-span-2">
            <Textarea id="design-description" value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canEdit} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isOnline} onChange={(event) => setIsOnline(event.target.checked)} disabled={!canEdit} />
            Show on the website once it is connected
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!isActive} onChange={(event) => setIsActive(!event.target.checked)} disabled={!canEdit} />
            Retired: hide from pickers
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Photos" description="Front-facing shots on a plain background work best for the tablets and try-on later." />
        <CardBody className="grid gap-4">
          {images.length > 0 && (
            <ul className="flex flex-wrap gap-3">
              {images.map((image) => (
                <li key={image.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(image.thumbnailUrl)} alt="" className="size-28 rounded-lg border border-line object-cover" />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setImages((current) => current.filter((entry) => entry.id !== image.id))}
                      className="absolute top-1 right-1 rounded bg-ink/70 px-1.5 text-[11px] text-paper"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-line px-4 py-3 text-sm hover:border-navy">
              <input type="file" accept="image/*" multiple className="sr-only" onChange={upload} disabled={uploading} />
              {uploading ? "Uploading…" : "Add photos"}
            </label>
          )}
        </CardBody>
      </Card>

      {error && <Alert tone="risk">{error}</Alert>}
      {saved && <Alert tone="ok">Saved.</Alert>}
      {canEdit && (
        <Button type="submit" size="lg" loading={busy} className="justify-self-start" disabled={!name.trim() || !categoryId || !making}>
          {design ? "Save design" : "Create design"}
        </Button>
      )}
    </form>
  );
}
