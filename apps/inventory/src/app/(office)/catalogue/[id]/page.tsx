"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader, Spinner, buttonClass } from "@webfudge/ui";
import type { Design } from "@webfudge/utils/api";
import { DesignForm } from "@/components/design-form";
import { useResource } from "@/lib/api";

export default function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, loading } = useResource<{ data: Design }>(`/stock/designs/${id}`);
  const design = data?.data;

  return (
    <div className="grid gap-6">
      {loading ? (
        <Spinner className="text-navy" />
      ) : error || !design ? (
        <p className="text-sm text-risk">{error ?? "Design not found."}</p>
      ) : (
        <>
          <PageHeader
            title={design.name}
            description={<span className="font-mono">{design.code}</span>}
            actions={
              <Link href={`/stock?designId=${design.id}`} className={buttonClass("secondary")}>
                See pieces
              </Link>
            }
          />
          <DesignForm key={design.id} design={design} />
        </>
      )}
    </div>
  );
}
