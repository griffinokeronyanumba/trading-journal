import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { getAccountContext } from "@/features/accounts/queries";
import { ImportWizard } from "@/features/csv/components/import-wizard";

export const metadata: Metadata = { title: "Import trades" };

export default async function ImportPage() {
  const { accounts, active } = await getAccountContext();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Import trades"
        description="Bring in trades from a CSV — e.g. a previous export, or a backtest log. Instruments, strategies, sessions, grades and tags are matched by name."
      />
      <ImportWizard accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} defaultAccountId={active?.id ?? null} />
    </div>
  );
}
