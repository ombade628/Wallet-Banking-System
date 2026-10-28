import React, { useMemo, useState } from 'react';
import { useBanking } from '../../context/BankingContext';

export const TransactionsView: React.FC = () => {
  const { transactions, accounts, showToast } = useBanking();

  // Filters
  const [accountFilter, setAccountFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ---- Filter chain (all real, based on loaded txns) ----
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      // Account filter: match by masked last-4 (real account-derived)
      if (accountFilter !== 'all') {
        const acc = accounts.find((a) => a.id === accountFilter);
        if (acc) {
          const last4 = acc.maskedNumber.slice(-4);
          const related =
            tx.fromAccount.includes(last4) || tx.toAccount.includes(last4);
          if (!related) return false;
        }
      }

      // Direction
      if (directionFilter === 'sent' && tx.direction !== 'SENT') return false;
      if (directionFilter === 'received' && tx.direction !== 'RECEIVED') return false;

      // Date range
      if (dateFrom || dateTo) {
        const iso = dateToIso(tx.date);
        if (iso) {
          if (dateFrom && iso < dateFrom) return false;
          if (dateTo && iso > dateTo) return false;
        }
      }

      // Free text: reference / from / to / amount
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hit =
          tx.reference.toLowerCase().includes(q) ||
          tx.fromAccount.toLowerCase().includes(q) ||
          tx.toAccount.toLowerCase().includes(q) ||
          String(tx.amount).includes(q);
        if (!hit) return false;
      }

      return true;
    });
  }, [transactions, accounts, accountFilter, directionFilter, dateFrom, dateTo, searchQuery]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [accountFilter, directionFilter, dateFrom, dateTo, searchQuery]);

  // ---- Real metrics ----
  const totalTransacted = filtered.reduce((s, t) => s + t.amount, 0);
  const sentTotal = filtered.filter((t) => t.direction === 'SENT').reduce((s, t) => s + t.amount, 0);
  const receivedTotal = filtered
    .filter((t) => t.direction === 'RECEIVED')
    .reduce((s, t) => s + t.amount, 0);
  const netFlow = receivedTotal - sentTotal;

  // ---- Real pagination ----
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageStart = (clampedPage - 1) * pageSize;
  const visible = filtered.slice(pageStart, pageStart + pageSize);
  const showingFrom = filtered.length === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + pageSize, filtered.length);

  // ---- Real CSV export ----
  const handleExport = () => {
    if (filtered.length === 0) {
      showToast('No transactions to export.', 'info');
      return;
    }
    setExporting(true);
    try {
      const header =
        'Date,Time,Reference,From Account,To Account,Direction,Amount,Currency,Status\n';
      const rows = filtered
        .map(
          (t) =>
            `${t.date},${t.time},${t.reference},${t.fromAccount},${t.toAccount},${t.direction},${t.amount},${t.currency},${t.status}`
        )
        .join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `javabank-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${filtered.length} transactions.`, 'success');
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    setAccountFilter('all');
    setDirectionFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl text-[#002743] font-bold tracking-tight">Transactions</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs bg-[#00451a]/10 text-[#3bbc5f] font-semibold tracking-wide">
              Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#72777f]">
            Real-time institutional ledger and electronic fund settlement records.
          </p>
        </div>

        {/* Real metrics strip */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-[#c2c7cf]/40">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f0f3ff]">
            <span className="text-[10px] text-[#72777f] uppercase font-bold tracking-wider">Volume</span>
            <span className="text-xs font-bold text-[#151c27]">{filtered.length} records</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f0f3ff]">
            <span className="text-[10px] text-[#72777f] uppercase font-bold tracking-wider">Transacted</span>
            <span className="font-data-mono text-xs font-bold text-[#151c27]">
              ₹{totalTransacted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              netFlow >= 0 ? 'bg-[#00451a]/10' : 'bg-[#ffdad6]/40'
            }`}
          >
            <span
              className={`text-[10px] uppercase font-bold tracking-wider ${
                netFlow >= 0 ? 'text-[#3bbc5f]' : 'text-[#ba1a1a]'
              }`}
            >
              Net Flow
            </span>
            <span
              className={`font-data-mono text-xs font-bold ${
                netFlow >= 0 ? 'text-[#3bbc5f]' : 'text-[#ba1a1a]'
              }`}
            >
              {netFlow >= 0 ? '+' : '-'}₹
              {Math.abs(netFlow).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#c2c7cf]/30 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Account filter — built from real accounts */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#72777f]" htmlFor="filter-account">
              Account Filter
            </label>
            <div className="relative flex items-center">
              <select
                id="filter-account"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="w-full h-11 pl-3.5 pr-8 bg-[#f0f3ff] text-[#151c27] text-xs font-medium rounded-lg appearance-none cursor-pointer focus:outline-none focus:bg-[#e7eefe] border border-[#c2c7cf]/30"
              >
                <option value="all">All accounts ({accounts.length})</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountType} · {a.maskedNumber}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 pointer-events-none text-[#72777f] text-[18px]">
                expand_more
              </span>
            </div>
          </div>

          {/* Direction */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#72777f]" htmlFor="filter-direction">
              Transfer Direction
            </label>
            <div className="relative flex items-center">
              <select
                id="filter-direction"
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="w-full h-11 pl-3.5 pr-8 bg-[#f0f3ff] text-[#151c27] text-xs font-medium rounded-lg appearance-none cursor-pointer focus:outline-none focus:bg-[#e7eefe] border border-[#c2c7cf]/30"
              >
                <option value="all">All directions</option>
                <option value="sent">Sent (Debits)</option>
                <option value="received">Received (Credits)</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 pointer-events-none text-[#72777f] text-[18px]">
                expand_more
              </span>
            </div>
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#72777f]" htmlFor="filter-from">
              From Date
            </label>
            <input
              id="filter-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 px-3 bg-[#f0f3ff] text-[#151c27] text-xs rounded-lg focus:outline-none focus:bg-[#e7eefe] border border-[#c2c7cf]/30 font-data-mono"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#72777f]" htmlFor="filter-to">
              To Date
            </label>
            <input
              id="filter-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 px-3 bg-[#f0f3ff] text-[#151c27] text-xs rounded-lg focus:outline-none focus:bg-[#e7eefe] border border-[#c2c7cf]/30 font-data-mono"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-3 text-[#72777f] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, account, amount…"
              className="w-full h-11 pl-9 pr-3 bg-[#f0f3ff] text-[#151c27] text-xs rounded-lg focus:outline-none focus:bg-[#e7eefe] border border-[#c2c7cf]/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="h-11 px-3.5 rounded-lg bg-[#e2e8f8] hover:bg-[#dce2f3] text-[#151c27] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || filtered.length === 0}
              className="h-11 px-4 rounded-lg bg-[#0a3d62] hover:bg-[#002743] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor"
                  ></path>
                </svg>
              ) : (
                <span className="material-symbols-outlined text-[18px]">download</span>
              )}
              <span>{exporting ? 'Generating…' : 'Export CSV'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ledger card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#c2c7cf]/30 flex flex-col overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f0f3ff] flex items-center justify-center mb-4 text-[#72777f]">
              <span className="material-symbols-outlined text-[36px]">manage_search</span>
            </div>
            <h3 className="text-base font-bold text-[#151c27] mb-1">
              {transactions.length === 0 ? 'No transactions yet' : 'No transactions match your filters'}
            </h3>
            <p className="text-xs text-[#72777f] max-w-md mb-6">
              {transactions.length === 0
                ? 'Make a transfer or receive a deposit to see posted settlement records here.'
                : 'Try clearing the filters or widening the date range.'}
            </p>
            {transactions.length > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="h-10 px-5 rounded-lg bg-[#0a3d62] text-white text-xs font-semibold hover:bg-[#002743]"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left min-w-[1000px] border-collapse">
              <thead>
                <tr className="bg-[#f0f3ff] text-[#72777f] text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-6">Date &amp; Time</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">From Account</th>
                  <th className="py-3 px-4">To Account</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Currency</th>
                  <th className="py-3 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f3ff] text-xs">
                {visible.map((tx, idx) => {
                  const isSent = tx.direction === 'SENT';
                  return (
                    <tr
                      key={tx.id}
                      className={`${
                        idx % 2 === 1 ? 'bg-[#f0f3ff]/40' : 'bg-white'
                      } hover:bg-[#e2e8f8]/60 transition-colors`}
                    >
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#151c27]">{tx.date}</span>
                          <span className="text-[11px] text-[#72777f]">{tx.time}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-data-mono bg-[#e2e8f8] px-2 py-0.5 rounded text-[#42474e] font-semibold text-[11px]">
                          {tx.reference}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-[#e2e8f8] flex items-center justify-center text-[#72777f]">
                            <span className="material-symbols-outlined text-[16px]">
                              {tx.fromAccountType === 'SAVINGS'
                                ? 'account_balance_wallet'
                                : tx.fromAccountType === 'EXTERNAL'
                                ? 'domain'
                                : 'payments'}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#151c27]">{tx.fromAccount}</span>
                            <span className="text-[10px] text-[#72777f] uppercase tracking-wider">
                              {tx.fromAccountType || 'Account'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-[#e2e8f8] flex items-center justify-center text-[#72777f]">
                            <span className="material-symbols-outlined text-[16px]">
                              {tx.toAccountType === 'CHECKING'
                                ? 'payments'
                                : tx.toAccountType === 'EXTERNAL'
                                ? 'apartment'
                                : 'corporate_fare'}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#151c27]">{tx.toAccount}</span>
                            <span className="text-[10px] text-[#72777f] uppercase tracking-wider">
                              {tx.toAccountType || 'Beneficiary'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isSent ? 'bg-[#e2e8f8] text-[#42474e]' : 'bg-[#00451a]/10 text-[#3bbc5f]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {isSent ? 'arrow_outward' : 'call_received'}
                          </span>
                          <span>{isSent ? 'SENT' : 'RECEIVED'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <span
                          className={`font-data-mono font-bold ${
                            isSent ? 'text-[#ba1a1a]' : 'text-[#3bbc5f]'
                          }`}
                        >
                          {isSent ? '-' : '+'}₹
                          {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-center text-[#72777f] font-semibold">
                        {tx.currency}
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#00451a]/10 text-[#3bbc5f] text-[10px] font-bold">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination — real */}
        {filtered.length > 0 && (
          <div className="bg-white px-6 py-3 border-t border-[#e2e8f8] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#72777f]">
            <div>
              Showing{' '}
              <strong className="text-[#151c27]">
                {showingFrom}–{showingTo}
              </strong>{' '}
              of <strong className="text-[#151c27]">{filtered.length}</strong> filtered
              (total {transactions.length})
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={clampedPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg bg-[#f0f3ff] text-[#151c27] disabled:opacity-40 flex items-center justify-center hover:bg-[#e2e8f8]"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="px-2 font-data-mono">
                {clampedPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={clampedPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg bg-[#f0f3ff] text-[#151c27] disabled:opacity-40 flex items-center justify-center hover:bg-[#e2e8f8]"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 text-[11px] text-[#72777f]">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#62df7d]">verified_user</span>
          <span>Synced from backend /api/transfers/history</span>
        </div>
        <div className="flex items-center gap-2 font-data-mono">
          <span>LOADED: {transactions.length}</span>
          <span>•</span>
          <span>FILTERED: {filtered.length}</span>
        </div>
      </div>
    </div>
  );
};

// ---- helper: parse "26 Oct 2026" → "2026-10-26" ----
function dateToIso(display: string): string | null {
  try {
    const parsed = new Date(display);
    if (isNaN(parsed.getTime())) return null;
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}