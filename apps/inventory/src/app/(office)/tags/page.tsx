"use client";

import { use, useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Field, PageHeader, ScanInput, Select } from "@webfudge/ui";
import type { Receipt, StockItem } from "@webfudge/utils/api";
import { PrintSheet, TAG_TEMPLATES, TagLabel, type TagTemplate } from "@/components/labels";
import { errorMessage, useApi } from "@/lib/api";

const TEMPLATE_KEY = "mmj.backoffice.tagTemplate";

export default function TagsPage({ searchParams }: { searchParams: Promise<{ receipt?: string; ids?: string }> }) {
  const { receipt, ids } = use(searchParams);
  const api = useApi();
  const [items, setItems] = useState<StockItem[]>([]);
  const [template, setTemplate] = useState<TagTemplate>(() => {
    try {
      const saved = typeof window === "undefined" ? null : window.localStorage.getItem(TEMPLATE_KEY);
      return saved && saved in TAG_TEMPLATES ? (saved as TagTemplate) : "dumbbell";
    } catch {
      return "dumbbell";
    }
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = receipt
      ? api.get<{ data: Receipt }>(`/stock/receipts/${receipt}`).then((result) => result.data.items ?? [])
      : ids
        ? Promise.all(ids.split(",").map((id) => api.get<{ data: StockItem }>(`/stock/items/${id}`).then((result) => result.data)))
        : Promise.resolve([] as StockItem[]);
    load
      .then((loaded) => active && setItems(loaded))
      .catch((cause) => active && setError(errorMessage(cause)));
    return () => {
      active = false;
    };
  }, [api, receipt, ids]);

  async function add(code: string) {
    setError(null);
    try {
      const { data } = await api.get<{ data: StockItem }>(`/stock/items/lookup?code=${encodeURIComponent(code)}`);
      setItems((current) => (current.some((item) => item.id === data.id) ? current : [...current, data]));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  function chooseTemplate(value: TagTemplate) {
    setTemplate(value);
    try {
      window.localStorage.setItem(TEMPLATE_KEY, value);
    } catch {
      // The choice lasts until reload.
    }
  }

  const size = TAG_TEMPLATES[template];

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 print:hidden">
        <PageHeader
          title="Tags & labels"
          description="Print with the label printer selected and the paper size set to the label size. Each tag prints on its own label."
        />
        <Card>
          <CardHeader title="Pieces to print" description={`${items.length} tags`} />
          <CardBody className="grid gap-4">
            <ScanInput id="tags-scan" onScan={add} placeholder="Scan or type a tag, old tag or HUID to add it" />
            {error && <Alert tone="risk">{error}</Alert>}
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Label" htmlFor="tags-template">
                <Select id="tags-template" value={template} onChange={(event) => chooseTemplate(event.target.value as TagTemplate)}>
                  {Object.entries(TAG_TEMPLATES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button variant="gold" size="lg" disabled={!items.length} onClick={() => window.print()}>
                Print {items.length} {items.length === 1 ? "tag" : "tags"}
              </Button>
              {items.length > 0 && (
                <Button variant="ghost" onClick={() => setItems([])}>
                  Clear
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {items.length > 0 && (
        <section aria-label="Preview" className="grid gap-3">
          <p className="text-[13px] text-ash print:hidden">Preview at actual size</p>
          <PrintSheet width={size.width} height={size.height}>
            {items.map((item) => (
              <div key={item.id} className="outline outline-1 outline-line print:outline-0">
                <TagLabel item={item} template={template} />
              </div>
            ))}
          </PrintSheet>
        </section>
      )}
    </div>
  );
}
