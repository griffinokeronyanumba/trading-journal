import type { Metadata } from "next";
import { Wallet } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Accounts" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Accounts" description="Independent trading accounts with their own balances and limits." />
      <ComingSoon icon={Wallet} phase={2} title="Account management" items={["Starting balance", "Currency", "Risk per trade", "Daily loss %", "Static max drawdown %"]} />
    </div>
  );
}
