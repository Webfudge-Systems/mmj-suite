"use client";

import { PageHeader } from "@webfudge/ui";
import { DesignForm } from "@/components/design-form";

export default function NewDesignPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="New design" description="A design is the pattern pieces are made to. Every piece you receive is tagged against one, and its photos show on the showroom tablets." />
      <DesignForm />
    </div>
  );
}
