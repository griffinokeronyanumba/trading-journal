import type { Metadata } from "next";
import { Layers } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Instruments" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Instruments" description="Symbols you trade, with optional contract specifications." />
      <ComingSoon icon={Layers} phase={3} title="Instrument management" items={["XAUUSD · NAS100 · US30 · EURUSD · GBPUSD", "Custom instruments", "Contract specs"]} />
    </div>
  );
}
