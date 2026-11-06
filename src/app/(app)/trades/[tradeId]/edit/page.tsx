import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { getProfile } from "@/features/accounts/queries";
import { TradeForm } from "@/features/trades/components/trade-form";
import { getTradeFormData, tradeToInput } from "@/features/trades/form-data";
import { getTradeForEdit } from "@/features/trades/queries";

export const metadata: Metadata = { title: "Edit trade" };

export default async function EditTradePage({ params }: PageProps<"/trades/[tradeId]/edit">) {
  const { tradeId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(tradeId)) notFound();
  const [found, data, profile] = await Promise.all([getTradeForEdit(tradeId), getTradeFormData(), getProfile()]);
  if (!found) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit trade" description="Changes recalculate balances and statistics everywhere." />
      <TradeForm {...data} tradeId={tradeId} initial={tradeToInput(found.trade, found, profile.timezone)} />
    </div>
  );
}
