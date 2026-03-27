"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Coins, Receipt } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getBalance, getTransactions } from "@/lib/tauri";
import { formatCBT } from "@/lib/utils";
import type { Transaction } from "@/types/colabbot";

export default function EarningsPage() {
  const { agentConfig } = useAppStore();
  const [balance, setBalance] = useState<number | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!agentConfig) return;
      try {
        const [bal, hist] = await Promise.all([
          getBalance(agentConfig.agentId),
          getTransactions(agentConfig.agentId),
        ]);
        setBalance(bal);
        setTxns(hist);
      } catch {
        // ignore in dev
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [agentConfig]);

  const earned = txns.filter((tx) => tx.type === "earned").reduce((sum, tx) => sum + tx.amount, 0);
  const spent = txns.filter((tx) => tx.type === "spent").reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Wallet</p>
          <h1 className="page-title">CBT earnings</h1>
          <p className="page-copy mt-2 max-w-2xl">
            Saldo, kumulierte Einnahmen und Buchungen in einer einzigen Ansicht. Keine Marketing-Karten,
            sondern direkt die Zahlen, die man im Betrieb braucht.
          </p>
        </div>

        <a
          href="https://colabbot.com/#buy-cbt"
          target="_blank"
          rel="noreferrer"
          className="panel inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-brand transition hover:text-white"
        >
          Founder Backer Packs
          <ArrowUpRight size={14} />
        </a>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <WalletCard label="Balance" value={balance !== null ? formatCBT(balance) : "—"} loading={loading} accent />
        <WalletCard label="Total earned" value={formatCBT(earned)} loading={loading} />
        <WalletCard label="Total spent" value={formatCBT(spent)} loading={loading} />
      </section>

      <section className="panel p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Receipt size={18} />
          </div>
          <div>
            <p className="eyebrow mb-1">Ledger</p>
            <h2 className="text-xl font-semibold text-white">Transaction history</h2>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">Loading wallet…</div>
        ) : txns.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand/10 text-brand">
              <Coins size={20} />
            </div>
            <p className="text-sm font-medium text-white">Noch keine Buchungen</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Sobald Aufgaben verifiziert sind oder Top-ups eingehen, wird hier die lokale Wallet-Historie angezeigt.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {txns.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-[1.5rem] border border-white/8 bg-black/10 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-white">{tx.note ?? `${tx.type} transaction`}</p>
                  <p className="mt-1 text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <div className={tx.type === "spent" ? "text-sm font-semibold text-red-300" : "text-sm font-semibold text-brand"}>
                  {tx.type === "spent" ? "-" : "+"}
                  {formatCBT(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WalletCard({
  label,
  value,
  loading,
  accent,
}: {
  label: string;
  value: string;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <div className="stat-tile">
      <p className="eyebrow">{label}</p>
      {loading ? (
        <div className="mt-4 h-8 w-28 animate-pulse rounded-xl bg-white/8" />
      ) : (
        <p className={accent ? "mt-4 text-3xl font-semibold text-brand" : "mt-4 text-3xl font-semibold text-white"}>
          {value}
        </p>
      )}
    </div>
  );
}
