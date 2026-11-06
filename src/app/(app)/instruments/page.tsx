import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InstrumentFormDialog } from "@/features/instruments/components/instrument-form-dialog";
import { InstrumentRowActions } from "@/features/instruments/components/instrument-row-actions";
import { categoryLabel } from "@/features/instruments/constants";
import { listInstruments } from "@/features/instruments/queries";
import { formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";

export const metadata: Metadata = { title: "Instruments" };

export default async function InstrumentsPage() {
  const supabase = await createClient();
  const [instruments, rows] = await Promise.all([
    listInstruments(),
    fetchAll((from, to) => supabase.from("trades").select("instrument_id").range(from, to)),
  ]);
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(r.instrument_id, (counts.get(r.instrument_id) ?? 0) + 1));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Instruments"
        description="Symbols you trade. Add contract specs only where you want automatic P&L."
        actions={<InstrumentFormDialog trigger={<Button size="sm"><Plus /> New instrument</Button>} />}
      />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Symbol</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Quote</TableHead>
            <TableHead className="text-right">Tick size</TableHead>
            <TableHead className="text-right">Tick value</TableHead>
            <TableHead>Auto P&amp;L</TableHead>
            <TableHead className="text-right">Trades</TableHead>
            <TableHead className="w-20"><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instruments.map((i) => (
            <TableRow key={i.id} className={i.is_active ? undefined : "opacity-55"} data-testid={`instrument-${i.symbol}`}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="num font-medium">{i.symbol}</span>
                  {i.display_name && <span className="text-xs text-muted-foreground">{i.display_name}</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {categoryLabel(i.category)}
                  {!i.is_active && <Badge variant="outline">Inactive</Badge>}
                </div>
              </TableCell>
              <TableCell className="num">{i.quote_currency ?? "—"}</TableCell>
              <TableCell className="num text-right">{i.tick_size != null ? formatNumber(i.tick_size, 10) : "—"}</TableCell>
              <TableCell className="num text-right">{i.tick_value != null ? formatNumber(i.tick_value, 8) : "—"}</TableCell>
              <TableCell>
                {i.tick_size != null && i.tick_value != null ? <Badge variant="profit">Enabled</Badge> : <Badge variant="outline">Manual</Badge>}
              </TableCell>
              <TableCell className="num text-right">{counts.get(i.id) ?? 0}</TableCell>
              <TableCell><InstrumentRowActions instrument={i} tradeCount={counts.get(i.id) ?? 0} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
