"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Truck } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Spinner, Table, Td, Th, Tr } from "@webfudge/ui";
import type { Supplier } from "@webfudge/utils/api";
import { SupplierForm } from "@/components/supplier-form";
import { useResource } from "@/lib/api";

export default function SuppliersPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager", "stock_keeper");
  const suppliers = useResource<{ data: Supplier[] }>("/stock/suppliers?active=all");

  return (
    <div className="grid gap-6">
      <PageHeader title="Suppliers & karigars" description="Who goods are received from. Open one to see their details, bills and what was received." />
      {canEdit && (
        <Card>
          <CardHeader title="Add" />
          <CardBody>
            <SupplierForm onSaved={(saved) => router.push(`/suppliers/${saved.id}`)} />
          </CardBody>
        </Card>
      )}
      <Card className="overflow-hidden">
        {suppliers.loading && !suppliers.data ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : !suppliers.data?.data.length ? (
          <EmptyState icon={Truck} title="No suppliers yet" description="Add the suppliers and karigars you receive goods from." />
        ) : (
          <Table minWidth={640}>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Phone</Th>
                <Th>City</Th>
                <Th>GSTIN</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {suppliers.data.data.map((supplier) => (
                <Tr key={supplier.id} className="cursor-pointer" onClick={() => router.push(`/suppliers/${supplier.id}`)}>
                  <Td className="font-semibold">
                    <Link href={`/suppliers/${supplier.id}`} className="hover:underline" onClick={(event) => event.stopPropagation()}>
                      {supplier.name}
                    </Link>
                    {!supplier.isActive && <Badge className="ml-2">Inactive</Badge>}
                  </Td>
                  <Td>
                    <Badge tone={supplier.kind === "karigar" ? "gold" : "neutral"}>{supplier.kind === "karigar" ? "Karigar" : "Supplier"}</Badge>
                  </Td>
                  <Td>{supplier.phone ?? "—"}</Td>
                  <Td>{supplier.city ?? "—"}</Td>
                  <Td className="font-mono">{supplier.gstin ?? "—"}</Td>
                  <Td align="right">
                    <ChevronRight className="inline size-4 text-gray-400" aria-hidden />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
