"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, FileUp, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseCsvObjects } from "@/lib/csv";
import { commitImport, previewImport } from "../actions";
import type { PreviewRow, RowError } from "../prepare";

type Preview = { total: number; valid: number; errors: RowError[]; preview: PreviewRow[] };

export function ImportWizard({ accounts, defaultAccountId }: { accounts: { id: string; name: string }[]; defaultAccountId: string | null }) {
  const [accountId, setAccountId] = useState<string | null>(defaultAccountId ?? accounts[0]?.id ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [result, setResult] = useState<Preview | null>(null);
  const [imported, setImported] = useState<number | null>(null);
  const [pending, start] = useTransition();

  const check = (r: Record<string, string>[], acc: string | null) =>
    start(async () => {
      const res = await previewImport({ rows: r, accountId: acc });
      if (!res.ok) { setResult(null); return void toast.error(res.error); }
      setResult(res.data);
    });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setImported(null);
    if (file.size > 3 * 1024 * 1024) return void toast.error("That file is larger than 3 MB. Split it into smaller files.");
    const text = await file.text();
    const { rows: parsed, headers } = parseCsvObjects(text);
    if (!headers.includes("trade_date") || !headers.includes("symbol")) return void toast.error("This doesn't look like a trades CSV — download the template to see the expected columns.");
    setFileName(file.name);
    setRows(parsed);
    check(parsed, accountId);
  };

  const doImport = () =>
    start(async () => {
      if (!rows) return;
      const res = await commitImport({ rows, accountId });
      if (!res.ok) return void toast.error(res.error);
      setImported(res.data.imported);
      setRows(null); setResult(null); setFileName(null);
      toast.success(`${res.data.imported} trades imported`);
    });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle>1 · Choose the file and account</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_18rem]">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
            <FileUp className="size-6" />
            <span className="font-medium">{fileName ?? "Choose a .csv file"}</span>
            <span className="text-xs">Exported from this app, or built from the template</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" data-testid="import-file" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <div className="flex flex-col gap-3">
            <Field label="Import into account" hint="Rows with an “account” column that matches one of your accounts go there instead.">
              <Select value={accountId ?? undefined} onValueChange={(v) => { setAccountId(v); if (rows) check(rows, v); }}>
                <SelectTrigger aria-label="Import into account"><SelectValue placeholder="Choose account" /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Button asChild variant="link" size="sm" className="self-start px-0"><a href="/api/export/template" download>Download the template</a></Button>
          </div>
        </CardContent>
      </Card>

      {pending && !result && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Checking…</p>}

      {result && (
        <Card data-testid="import-preview">
          <CardHeader><CardTitle>2 · Check</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm">
              <span className="num">{result.total}</span> rows · <span className="num text-profit">{result.valid} ready</span>
              {result.errors.length > 0 && <> · <span className="num text-loss">{result.total - result.valid} with problems</span></>}
            </p>
            {result.errors.length > 0 && (
              <div className="rounded-md border border-loss/30 bg-loss/5 p-3" data-testid="import-errors">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-loss"><TriangleAlert className="size-4" /> Fix these rows in your file, then choose it again. Nothing is imported until every row is valid.</p>
                <ul className="max-h-60 overflow-y-auto text-xs">
                  {result.errors.map((e) => <li key={e.line} className="py-0.5"><span className="num text-muted-foreground">Line {e.line}:</span> {e.messages.join(" · ")}</li>)}
                </ul>
              </div>
            )}
            {result.preview.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-[11px] text-muted-foreground"><th className="py-1 text-left font-medium">Line</th><th className="text-left font-medium">Date</th><th className="text-left font-medium">Account</th><th className="text-left font-medium">Symbol</th><th className="text-left font-medium">Dir</th><th className="text-right font-medium">Net P&amp;L</th></tr></thead>
                  <tbody>{result.preview.map((p) => (
                    <tr key={p.line} className="border-t border-border/60"><td className="num py-1 text-muted-foreground">{p.line}</td><td className="num">{p.date}</td><td>{p.account}</td><td className="num">{p.symbol}</td><td className="uppercase">{p.direction}</td><td className="num text-right">{p.net}</td></tr>
                  ))}</tbody>
                </table>
                {result.valid > result.preview.length && <p className="mt-1 text-xs text-muted-foreground">…and {result.valid - result.preview.length} more.</p>}
              </div>
            )}
            <Button className="self-start" disabled={pending || result.errors.length > 0 || result.valid === 0} onClick={doImport}>
              {pending && <Loader2 className="animate-spin" />} Import {result.valid} trade{result.valid === 1 ? "" : "s"}
            </Button>
          </CardContent>
        </Card>
      )}

      {imported != null && (
        <div className="flex items-center gap-3 rounded-lg border border-profit/30 bg-profit/5 p-4 text-sm" role="status">
          <CheckCircle2 className="size-5 text-profit" /> {imported} trades imported.
          <Button asChild size="sm" variant="secondary"><Link href="/trades">View trades</Link></Button>
        </div>
      )}
    </div>
  );
}
