import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/features/accounts/queries";
import { TradeForm } from "@/features/trades/components/trade-form";
import { blankTradeInput, duplicateInput, getTradeFormData, tradeToInput } from "@/features/trades/form-data";
import { getTradeForEdit } from "@/features/trades/queries";

export const metadata: Metadata = { title: "New trade" };

export default async function NewTradePage({ searchParams }: PageProps<"/trades/new">) {
  const { duplicate } = await searchParams;
  const [data, base, profile] = await Promise.all([getTradeFormData(), blankTradeInput(), getProfile()]);
  let initial = base;
  let duplicated = false;
  if (typeof duplicate === "string" && /^[0-9a-f-]{36}$/i.test(duplicate)) {
    const src = await getTradeForEdit(duplicate);
    if (src) {
      initial = duplicateInput(tradeToInput(src.trade, src, profile.timezone), base);
      duplicated = true;
    }
  }

  if (data.accounts.filter((a) => !a.is_archived).length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="New trade" />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <p className="text-sm">Create a trading account first — every trade belongs to an account.</p>
          <Button asChild size="sm"><Link href="/accounts">Go to accounts</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={duplicated ? "New trade (duplicated)" : "New trade"}
        description={duplicated ? "Plan and context copied — enter the new execution and result." : "Record the plan, execution and result. Calculations update as you type."}
      />
      <TradeForm {...data} initial={initial} />
    </div>
  );
}
