import { Card, CardBody, CardHeader, LiveRateBoard, Wordmark } from "@webfudge/ui";
import { API_URL } from "@/lib/env";

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="bg-navy-deep px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <Wordmark appName="POS & Billing" />
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6">
        <Card>
          <CardHeader title="Today's rates" description="Published from the Back Office. Updates on its own within a minute." />
          <CardBody>
            <LiveRateBoard apiUrl={API_URL} />
          </CardBody>
        </Card>
        <p className="text-sm text-ash">Billing screens arrive in phase 2: new bill, old gold, payments, invoices and day close.</p>
      </main>
    </div>
  );
}
