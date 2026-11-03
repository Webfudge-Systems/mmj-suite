"use client";

import Link from "next/link";
import { useAuth } from "@webfudge/auth/components";
import { RATE_EDITOR_ROLES, STAFF_ROLES } from "@webfudge/config";
import { useCurrentRates } from "@webfudge/hooks";
import { Badge, Card, CardBody, CardHeader, PageHeader, RateBoard, buttonClass } from "@webfudge/ui";
import { formatDate } from "@webfudge/utils/formatters";
import { API_URL } from "@/lib/env";

function isToday(iso: string) {
  return formatDate(iso) === formatDate(new Date().toISOString());
}

export default function DashboardPage() {
  const { staff, hasRole } = useAuth();
  const { card, loading, error } = useCurrentRates(API_URL);
  const canPublish = hasRole(...RATE_EDITOR_ROLES);
  const stale = card && !isToday(card.effectiveFrom);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Good day, ${staff?.fullName?.split(" ")[0] || staff?.username}`}
        description="Stock screens arrive in phase 1. For now the Back Office sets the day's rate for every MMJ app."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Today's rates"
            description="The website, tablets and billing counter all price from this card."
            action={
              stale ? (
                <Badge tone="warn">Not updated today</Badge>
              ) : card ? (
                <Badge tone="ok">Updated today</Badge>
              ) : null
            }
          />
          <CardBody className="grid gap-4">
            <RateBoard card={card} loading={loading} error={error} />
            {canPublish && (
              <Link href="/rates" className={buttonClass(stale || !card ? "gold" : "secondary", "md", "justify-self-start")}>
                {card ? "Publish new rates" : "Publish the first rates"}
              </Link>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Your access" />
          <CardBody className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-ash">Organization</span>
              <span className="text-right font-semibold">{staff?.organization.name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ash">Role</span>
              <span className="text-right font-semibold">{staff && STAFF_ROLES[staff.staffRole].label}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ash">Branches</span>
              <span className="text-right font-semibold">
                {staff?.branches.map((branch) => `${branch.name} (${branch.code})`).join(", ") || "None yet"}
              </span>
            </div>
            <p className="border-t border-line pt-3 text-[12px] text-ash">
              Staff accounts, roles and branches are managed in the backend admin panel until the Settings screen
              arrives.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
