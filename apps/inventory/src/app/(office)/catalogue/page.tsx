"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@webfudge/auth/components";
import { Badge, Card, EmptyState, Input, PageHeader, Pager, Select, Spinner, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { Category, Design, Page } from "@webfudge/utils/api";
import { useResource } from "@/lib/api";
import { mediaUrl } from "@/lib/env";

const MAKING_LABEL = { per_gram: "/g", percent: "%", fixed: " fixed" } as const;

export default function CataloguePage() {
  const { hasRole } = useAuth();
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), pageSize: "40" });
  if (q.trim()) params.set("q", q.trim());
  if (categoryId) params.set("categoryId", categoryId);

  const designs = useResource<Page<Design>>(`/stock/designs?${params}`);
  const categories = useResource<{ data: Category[] }>("/stock/categories");

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Catalogue"
        description="Each design is a catalogue entry. Every tagged piece belongs to one design."
        actions={
          hasRole("owner", "branch_manager", "stock_keeper") && (
            <Link href="/catalogue/new" className={buttonClass("primary")}>
              New design
            </Link>
          )
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          id="design-search"
          placeholder="Search design number or name"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          id="design-category"
          aria-label="Category"
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setPage(1);
          }}
          className="max-w-[200px]"
        >
          <option value="">All categories</option>
          {categories.data?.data.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {designs.loading ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : designs.error ? (
          <p className="p-5 text-[13px] text-risk">{designs.error}</p>
        ) : !designs.data?.data.length ? (
          <EmptyState
            title={q || categoryId ? "No designs match" : "No designs yet"}
            description={q || categoryId ? "Try another search." : "Add your first design, or import your current stock and designs are created for you."}
          />
        ) : (
          <>
            <Table minWidth={720}>
              <thead>
                <tr>
                  <Th className="w-14" />
                  <Th>Design</Th>
                  <Th>Category</Th>
                  <Th>Purity</Th>
                  <Th align="right">Making</Th>
                  <Th align="right">In stock</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {designs.data.data.map((design) => (
                  <Tr key={design.id} className="hover:bg-sunk/60">
                    <Td>
                      {design.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(design.images[0].thumbnailUrl)} alt="" className="size-10 rounded-md object-cover" />
                      ) : (
                        <span className="block size-10 rounded-md bg-sunk" />
                      )}
                    </Td>
                    <Td>
                      <Link href={`/catalogue/${design.id}`} className="grid hover:underline">
                        <span className="font-semibold">{design.name}</span>
                        <span className="font-mono text-[12px] text-gold-deep">{design.code}</span>
                      </Link>
                    </Td>
                    <Td>{design.category?.name ?? "—"}</Td>
                    <Td>{design.defaultPurity ?? design.metal}</Td>
                    <Td align="right">{design.making ? `${design.making.type === "percent" ? "" : "₹"}${design.making.value}${MAKING_LABEL[design.making.type]}` : "—"}</Td>
                    <Td align="right">{design.inStock ?? 0}</Td>
                    <Td>
                      <span className="flex justify-end gap-1">
                        {design.isOnline && <Badge tone="navy">Online</Badge>}
                        {!design.isActive && <Badge>Retired</Badge>}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pager pagination={designs.data.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
