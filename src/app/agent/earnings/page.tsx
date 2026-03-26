"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { getBalance, getTransactions } from "@/lib/tauri";
import { formatCBT } from "@/lib/utils";

interface Transaction {
  id:         string;
  type:       "earned" | "spent" | "topup";
  amount:     number;
  description: string;
  task_id?:   string;
  created_at: string;
}

export default function EarningsPage() {
  const { agentConfig } = useAppStore();
  const [balance, setBalance]   = useState<number | null>(null);
  const [txns,    setTxns]      = useState<Transaction[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      if (!agentConfig) return;
      try {
        const bal  = await getBalance(agentConfig.agent_id);
        const hist = await getTransactions(agentConfig.agent_id);
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

  const earned = txns.filter(t => t.type === "earned").reduce((s, t) => s + t.amount, 0);
  const spent  = txns.filter(t => t.type === "spent" ).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-white text-xl font-semibold">Earnings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your ColabToken balance and history</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Balance"
          value={balance !== null ? formatCBT(balance) : "—"}
          unit="CBT"
          highlight
          loading={loading}
        />
        <StatCard
          label="Total earned"
          value={formatCBT(earned)}
          unit="CBT"
          loading={loading}
        />
        <StatCard
          label="Total spent"
          value={formatCBT(spent)}
          unit="CBT"
          loading={loading}
        />
      </div>

      {/* Top up */}
      <div className="bg-gradient-to-r from-brand/10 to-brand/5 border border-brand/20 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <div className="text-white text-sm font-medium">Top up CBT</div>
          <div className="text-gray-400 text-xs mt-0.5">
            Support the network as a Founder Backer — get CBT at ~70% off.
          </div>
        </div>
        <a
          href="https://colabbot.com/#buy-cbt"
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0 bg-brand hover:opacity-90 transition text-white text-xs font-medium px-4 py-2 rounded-lg"
        >
          Buy CBT →
        </a>
      </div>

      {/* Transaction history */}
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-gray-500 text-xs uppercase tracking-wide mb-3">Transaction History</h2>
        {loading ? (
          <div className="text-gray-600 text-sm text-center py-8">Loading…</div>
        ) : txns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">🪙</div>
            <div className="text-gray-500 text-sm">No transactions yet.</div>
            <div className="text-gray-600 text-xs mt-1">
              Complete tasks to start earning CBT.
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {txns.map(tx => (
              <div key={tx.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="text-lg">
                    {tx.type === "earned" ? "⬆" : tx.type === "spent" ? "⬇" : "💳"}
                  </div>
                  <div>
                    <div className="text-gray-300 text-xs font-medium">{tx.description}</div>
                    <div className="text-gray-600 text-[10px] font-mono mt-0.5">
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className={tx.type === "earned" || tx.type === "topup"
                  ? "text-green-400 text-sm font-mono"
                  : "text-red-400 text-sm font-mono"
                }>
                  {tx.type === "spent" ? "−" : "+"}{formatCBT(tx.amount)} CBT
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, unit, highlight, loading
}: {
  label: string; value: string; unit: string; highlight?: boolean; loading?: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-gray-500 text-xs mb-2">{label}</div>
      {loading ? (
        <div className="h-6 w-16 bg-gray-800 rounded animate-pulse" />
      ) : (
        <div className={highlight ? "text-brand text-lg font-mono font-semibold" : "text-white text-lg font-mono font-semibold"}>
          {value} <span className="text-gray-600 text-xs">{unit}</span>
        </div>
      )}
    </div>
  );
}
