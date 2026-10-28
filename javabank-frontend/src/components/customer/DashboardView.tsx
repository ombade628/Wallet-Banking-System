import React, { useState } from 'react';
import { useBanking } from '../../context/BankingContext';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    accounts,
    transactions,
    loans,
    navigate,
    setSelectedAccountId,
    showToast,
  } = useBanking();
  const [showEmptyPreview, setShowEmptyPreview] = useState(false);

  // ---- Real derived numbers ----
  const totalBalance = accounts
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + a.balance, 0);

  const formattedTotal = '₹' + totalBalance.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const pendingCount = accounts.filter((a) => a.status === 'pending').length;
  const frozenCount = accounts.filter((a) => a.status === 'frozen').length;

  // Real pending loan count from backend-loaded list
  const pendingLoans = loans.filter((l) => l.status === 'PENDING');
  const approvedLoans = loans.filter((l) => l.status === 'APPROVED');
  const disbursedLoans = loans.filter((l) => l.status === 'DISBURSED');

  // Real net-flow card (last 30 loaded txns is fine for a preview)
  const recentTx = transactions.slice(0, 5);
  const inflow = transactions
    .filter((t) => t.direction === 'RECEIVED')
    .reduce((s, t) => s + t.amount, 0);
  const outflow = transactions
    .filter((t) => t.direction === 'SENT')
    .reduce((s, t) => s + t.amount, 0);

  const downloadStatement = () => {
    // Generate a real CSV from what we have loaded
    if (transactions.length === 0) {
      showToast('No transactions to export yet.', 'info');
      return;
    }
    const header = 'Date,Time,Reference,From,To,Amount,Currency,Direction\n';
    const rows = transactions
      .map(
        (t) =>
          `${t.date},${t.time},${t.reference},${t.fromAccount},${t.toAccount},${t.amount},${t.currency},${t.direction}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `javabank-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${transactions.length} transactions to CSV.`, 'success');
  };

  const statusBadge = (status: string) => {
    if (status === 'active')
      return {
        cls: 'bg-[#DCFCE7] text-[#15803D]',
        dot: 'bg-[#3bbc5f]',
        label: 'ACTIVE',
      };
    if (status === 'pending')
      return {
        cls: 'bg-[#FEF3C7] text-[#B45309]',
        dot: 'bg-[#B45309]',
        label: 'PENDING',
      };
    return { cls: 'bg-[#ffdad6] text-[#ba1a1a]', dot: 'bg-[#ba1a1a]', label: 'FROZEN' };
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-[#72777f] text-xs uppercase tracking-wider font-semibold">
            <span>Overview</span>
            <span>/</span>
            <span className="text-[#005cab] font-semibold">Portfolio Summary</span>
          </div>
          <h1 className="text-3xl text-[#002743] font-bold tracking-tight mt-1">
            Welcome back, {currentUser?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-sm text-[#42474e]">
            Real-time ledger overview and institutional banking services for your primary profile.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 border border-[#c2c7cf]/40">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3bbc5f] animate-pulse"></span>
            <span className="text-xs text-[#42474e]">
              Core Banking API: <strong className="text-[#151c27]">Operational</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={downloadStatement}
            className="bg-white hover:bg-[#e2e8f8] text-[#002743] text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 border border-[#c2c7cf]/40"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Statement CSV</span>
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <section aria-label="Account Statistics" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Balance */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#42474e] font-medium">Active Balance</span>
            <div className="w-9 h-9 rounded-lg bg-[#e7eefe] flex items-center justify-center text-[#002743]">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl text-[#151c27] font-bold tracking-tight">{formattedTotal}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#42474e]">
              <span className="material-symbols-outlined text-[16px] text-[#3bbc5f]">payments</span>
              <span>
                {activeCount} active · {pendingCount} pending · {frozenCount} frozen
              </span>
            </div>
          </div>
          <div className="mt-4 pt-2 flex items-center justify-between text-xs text-[#42474e] bg-[#f0f3ff] px-3 py-1.5 rounded">
            <span>Combined INR valuation</span>
            <span className="font-data-mono text-[#002743] font-semibold">{accounts.length} accounts</span>
          </div>
        </div>

        {/* Money flow */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#42474e] font-medium">Money Flow (loaded)</span>
            <div className="w-9 h-9 rounded-lg bg-[#e7eefe] flex items-center justify-center text-[#005cab]">
              <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl text-[#151c27] font-bold tracking-tight">
              ₹{(inflow - outflow).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#42474e]">
              <span className="text-[#3bbc5f] font-semibold">
                +₹{inflow.toLocaleString('en-IN')} in
              </span>
              <span className="text-[#ba1a1a] font-semibold">
                -₹{outflow.toLocaleString('en-IN')} out
              </span>
            </div>
          </div>
          <div className="mt-4 pt-2 flex items-center justify-between text-xs text-[#42474e] bg-[#f0f3ff] px-3 py-1.5 rounded">
            <span>From {transactions.length} loaded transactions</span>
            <span className="text-[#005cab] font-semibold">LIVE</span>
          </div>
        </div>

        {/* Loans */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#42474e] font-medium">Loans</span>
            <div className="w-9 h-9 rounded-lg bg-[#e7eefe] flex items-center justify-center text-[#004786]">
              <span className="material-symbols-outlined text-[20px]">real_estate_agent</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl text-[#151c27] font-bold tracking-tight">
                {pendingLoans.length}
              </div>
              <span className="text-xs text-[#72777f]">
                {pendingLoans.length === 1 ? 'application' : 'applications'} pending
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#42474e]">
              <span className="w-2 h-2 rounded-full bg-[#0075d6]"></span>
              <span>
                {approvedLoans.length} approved · {disbursedLoans.length} disbursed
              </span>
            </div>
          </div>
          <div className="mt-4 pt-2 flex items-center justify-between text-xs bg-[#f0f3ff] px-3 py-1.5 rounded">
            <span className="text-[#42474e]">
              {pendingLoans.length > 0 ? 'Awaiting underwriter' : 'No pending actions'}
            </span>
            <button
              type="button"
              onClick={() => navigate('loans')}
              className="text-[#005cab] font-semibold hover:underline"
            >
              {pendingLoans.length > 0 ? 'View' : 'Apply'}
            </button>
          </div>
        </div>
      </section>

      {/* Accounts */}
      <section aria-label="Customer Accounts" className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#151c27] tracking-tight">Your Accounts</h2>
            <p className="text-xs text-[#42474e]">
              Manage active deposits, checking lines, and automated clearing house paths.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowEmptyPreview(!showEmptyPreview)}
              className="text-[#42474e] hover:text-[#151c27] text-xs font-medium px-3 py-1.5 rounded hover:bg-[#e2e8f8] transition-colors"
            >
              {showEmptyPreview ? 'Show Populated View' : 'Toggle Preview Mode'}
            </button>
            <button
              type="button"
              onClick={() => navigate('new-account')}
              className="bg-[#002743] hover:bg-[#0a3d62] text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>+ New account</span>
            </button>
          </div>
        </div>

        {showEmptyPreview ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-[#c2c7cf]/30 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[#e2e8f8] text-[#72777f] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px]">account_balance</span>
            </div>
            <h3 className="text-base font-semibold text-[#151c27]">No accounts yet</h3>
            <p className="text-xs text-[#42474e] max-w-md mt-1 mb-6">
              You do not have any open depository or savings facilities associated with this corporate identity.
            </p>
            <button
              type="button"
              onClick={() => navigate('new-account')}
              className="bg-[#002743] hover:bg-[#0a3d62] text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Create your first account</span>
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-[#c2c7cf]/30 text-center">
            <p className="text-xs text-[#72777f]">No accounts loaded yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-[#c2c7cf]/30 overflow-hidden flex flex-col">
            {accounts.slice(0, 3).map((account, idx) => {
              const badge = statusBadge(account.status);
              return (
                <React.Fragment key={account.id}>
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#f0f3ff]/60 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#e7eefe] flex items-center justify-center text-[#002743] flex-shrink-0">
                        <span className="material-symbols-outlined text-[22px]">
                          {account.accountType === 'SAVINGS'
                            ? 'account_balance'
                            : account.accountType === 'CHECKING'
                            ? 'credit_card'
                            : 'savings'}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-[#d4e3ff] text-[#004786] text-[11px] px-2 py-0.5 rounded font-bold tracking-wide">
                            {account.accountType}
                          </span>
                          <span className="font-data-mono text-sm text-[#151c27] font-semibold">
                            {account.maskedNumber}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${badge.cls}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                            {badge.label}
                          </span>
                        </div>
                        <span className="text-xs text-[#72777f] mt-1 truncate">{account.subtitle}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:text-right">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-[#72777f]">Available Balance</span>
                        <span className="text-lg text-[#151c27] font-bold">
                          ₹{account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAccountId(account.id);
                          navigate('account-detail');
                        }}
                        className="bg-[#f0f3ff] hover:bg-[#e7eefe] text-[#005cab] text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                  {idx < Math.min(accounts.length, 3) - 1 && <div className="h-px bg-[#e7eefe] w-full"></div>}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent transactions */}
      <section aria-label="Transaction Ledger" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#151c27] tracking-tight">Recent Transactions</h2>
            <p className="text-xs text-[#42474e]">
              Cleared clearinghouse and intra-bank electronic settlements.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('transactions')}
            className="text-[#005cab] hover:text-[#002743] text-xs font-semibold transition-colors inline-flex items-center gap-1"
          >
            <span>View all</span>
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#c2c7cf]/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f0f3ff] text-[#72777f] text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Reference</th>
                  <th className="py-3 px-6">From Account</th>
                  <th className="py-3 px-6">To Account</th>
                  <th className="py-3 px-6 text-right">Amount</th>
                  <th className="py-3 px-6 text-center">Currency</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#f0f3ff]">
                {recentTx.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-[#72777f]">
                      No transactions yet. Make a transfer to see activity here.
                    </td>
                  </tr>
                )}
                {recentTx.map((tx, idx) => {
                  const isDebit = tx.direction === 'SENT';
                  return (
                    <tr
                      key={tx.id}
                      className={`${
                        idx % 2 === 1 ? 'bg-[#f0f3ff]/40' : 'bg-white'
                      } hover:bg-[#e2e8f8]/50 transition-colors`}
                    >
                      <td className="py-3.5 px-6 whitespace-nowrap text-[#151c27] font-medium text-xs">
                        {tx.date}
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="font-data-mono text-xs text-[#42474e] bg-[#e7eefe] px-2 py-0.5 rounded font-medium">
                          {tx.reference}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-[#151c27] font-data-mono">
                          <span className="material-symbols-outlined text-[16px] text-[#72777f]">
                            arrow_upward
                          </span>
                          <span>{tx.fromAccount}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-[#151c27] font-data-mono">
                          <span className="material-symbols-outlined text-[16px] text-[#72777f]">
                            arrow_downward
                          </span>
                          <span>{tx.toAccount}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap text-right">
                        <span
                          className={`font-data-mono font-bold text-xs ${
                            isDebit ? 'text-[#ba1a1a]' : 'text-[#3bbc5f]'
                          }`}
                        >
                          {isDebit ? '-' : '+'}₹
                          {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap text-center">
                        <span className="text-[11px] text-[#42474e] bg-[#f0f3ff] px-2 py-0.5 rounded font-medium">
                          {tx.currency}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-[#f0f3ff] px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between text-[#72777f] text-xs gap-2 border-t border-[#e2e8f8]">
            <span>
              Showing {recentTx.length} of {transactions.length} loaded records
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3bbc5f]"></span>
                Loaded from backend
              </span>
              <button
                type="button"
                onClick={downloadStatement}
                className="text-[#005cab] hover:underline font-semibold"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};