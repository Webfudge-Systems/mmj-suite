"use client";

import Link from "next/link";
import { PageHeader } from "@webfudge/ui";
import { DesignForm } from "@/components/design-form";

export default function NewDesignPage() {
  return (
    <div className="grid gap-6">
      <Link href="/catalogue" className="text-[13px] text-ash hover:text-navy">
        ← Catalogue
      </Link>
      <PageHeader title="New design" />
      <DesignForm />
    </div>
  );
}
