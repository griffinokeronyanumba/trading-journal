import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AccountCard } from "@/features/accounts/components/account-card";
import { AccountFormDialog } from "@/features/accounts/components/account-form-dialog";
import { getProfile, listAccounts } from "@/features/accounts/queries";
import { getTradeFacts } from "@/features/trades/facts";
import { accountStatus, summarize } from "@/lib/analytics/metrics";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  const showArchived = (await searchParams).archived === "1";
  const [accounts, facts, profile] = await Promise.all([
    listAccounts({ includeArchived: true }),
    getTradeFacts(),
    getProfile(),
  ]);
  const archivedCount = accounts.filter((a) => a.is_archived).length;
  const visible = accounts.filter((a) => showArchived || !a.is_archived);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Accounts"
        description="Independent trading accounts, each with its own balance, limits and statistics."
        actions={
          <>
            {archivedCount > 0 && (
              <Button asChild variant="ghost" size="sm">
                <Link href={showArchived ? "/accounts" : "/accounts?archived=1"}>
                  {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
                </Link>
              </Button>
            )}
            <AccountFormDialog defaultCurrency={profile.default_currency} trigger={<Button size="sm"><Plus /> New account</Button>} />
          </>
        }
      />

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-card">
            <Wallet className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-medium">No accounts yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first account, for example a $10,000 backtesting account.
            </p>
          </div>
          <AccountFormDialog defaultCurrency={profile.default_currency} trigger={<Button size="sm"><Plus /> Create account</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((account) => {
            const trades = facts.filter((t) => t.account_id === account.id);
            const summary = summarize(trades, profile.breakeven_band_r);
            return (
              <AccountCard
                key={account.id}
                account={account}
                status={accountStatus(account, trades)}
                tradeCount={summary.totalTrades}
                recordedCount={trades.length}
                winRate={summary.winRate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
