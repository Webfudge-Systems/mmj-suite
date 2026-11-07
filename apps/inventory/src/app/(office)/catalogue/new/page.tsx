"use client";

import { PageHeader } from "@webfudge/ui";
import { DesignForm } from "@/components/design-form";

export default function NewDesignPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="New design" />
      <DesignForm />
    </div>
  );
}
