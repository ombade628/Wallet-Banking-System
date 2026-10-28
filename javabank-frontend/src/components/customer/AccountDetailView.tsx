import React, { useState } from 'react';
import { useBanking } from '../../context/BankingContext';

export const AccountDetailView: React.FC = () => {
  const {
    accounts,
    selectedAccountId,
    transactions,
    navigate,
    showToast,
    freezeAccount,
    unfreezeAccount,
    accountStatement,
  } = useBanking();

  const [filterType, setFilterType] = useState<'all' | 'credits' | 'debits'>('all');
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statement, setStatement] = useState<any | null>(null);

  const account =
    accounts.find((a) => a.id === selectedAccountId || a.accountNumber === selectedAccountId) ||
    accounts[0];

  if (!account) {
    return (
      <div className="p-10 text-center text-sm text-[#72777f]">
        Loading account… <br />
        <button
          onClick={() => navigate('accounts')}
          className="mt-4 px-4 py-2 rounded-lg bg-[#0a3d62] text-white text-xs font-semibold"
        >
          Back to accounts
        </button>
      </div>
    );
  }

  const copyText = (val: string, label: string) => {
    navigator.clipboard?.writeText(val);
    showToast(`${label} copied to clipboard!`, 'info');
  };

  // Only transactions involving this exact account
  const accountTransactions = transactions.filter((tx) => {
    const last4 = account.maskedNumber.slice(-4);
    const related = tx.fromAccount.includes(last4) || tx.toAccount.includes(last4);
    if (!related) return false;

    if (filterType === 'credits') return tx.direction === 'RECEIVED';
    if (filterType === 'debits') return tx.direction === 'SENT';
    return true;
  });

  // Derived real totals from THIS account's visible transactions
  const inflow = accountTransactions
    .filter((t) => t.direction === 'RECEIVED')
    .reduce((s, t) => s + t.amount, 0);
  const outflow = accountTransactions
    .filter((t) => t.direction === 'SENT')
    .reduce((s, t) => s + t.amount, 0);

  const isFrozen = account.status === 'frozen';

  const handleFreezeToggle = async () => {
    setBusy(true);
    try {
      if (isFrozen) {
        await unfreezeAccount(account.id);
        showToast('Account unfrozen successfully.', 'success');
      } else {
        await freezeAccount(account.id);
        showToast('Account frozen successfully.', 'success');
      }
      setShowFreezeModal(false);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Action failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleStatement = async () => {
    const now = new Date();
    try {
      const res = await accountStatement(account.id, now.getFullYear(), now.getMonth() + 1);
      setStatement(res);
      showToast(
        `Statement ready: ${res.entryCount} entries · net ₹${Number(res.netFlow).toLocaleString('en-IN')}`,
        'success'
      );
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Statement unavailable', 'error');
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 flex flex-col gap-6">
      {/* Breadcrumb & title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-[#72777f]">
            <button
              type="button"
              onClick={() => navigate('accounts')}
              className="hover:text-[#002743] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
              <span>Accounts</span>
            </button>
            <span>/</span>
            <span className="text-[#151c27] font-semibold">Detail</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-3xl text-[#002743] font-bold tracking-tight">
              Account {account.maskedNumber}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-[#e7eefe] text-[#151c27] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00451a]"></span>
              {account.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('accounts')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#002743] hover:bg-[#e7eefe] transition-colors text-xs font-semibold shadow-sm border border-[#c2c7cf]/40"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to accounts</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('transfer')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a3d62] text-white hover:bg-[#002743] transition-colors text-xs font-semibold shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">send_money</span>
            <span>Transfer from this account</span>
          </button>
        </div>
      </div>

      {/* Summary card */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-[#d4e3ff] text-[#004786] font-bold tracking-wider uppercase">
                {account.accountType}
              </span>
              <div className="flex items-center gap-1.5 bg-[#f0f3ff] px-2.5 py-1 rounded">
                <span className="font-data-mono text-xs text-[#151c27] font-bold tracking-wider">
                  {account.maskedNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(account.accountNumber, 'Account number')}
                  className="text-[#72777f] hover:text-[#002743] transition-colors flex items-center"
                  title="Copy account number"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold ${
                  isFrozen
                    ? 'bg-[#ffdad6] text-[#ba1a1a]'
                    : 'bg-[#7ffc97] text-[#005320]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isFrozen ? 'lock' : 'check_circle'}
                </span>
                {account.status.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-base font-bold text-[#151c27]">{account.title}</span>
              <p className="text-xs text-[#72777f]">
                {account.interestRate ? (
                  <>
                    Daily interest compounding at{' '}
                    <span className="font-semibold text-[#151c27]">{account.interestRate}</span> ·
                  </>
                ) : null}{' '}
                Regulatory insured by DICGC (RBI)
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:items-end bg-[#f0f3ff] lg:bg-transparent p-4 lg:p-0 rounded-lg">
            <span className="text-[11px] text-[#72777f] uppercase font-bold tracking-wider">
              Available Balance
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl text-[#002743] font-bold tracking-tight">
                ₹{account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#42474e]">
              <span className="w-2 h-2 rounded-full bg-[#00451a]"></span>
              <span className="font-medium">{account.currency} · Real-time settled</span>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-[#e2e8f8] my-6"></div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-0.5 bg-[#f0f3ff] p-3 rounded-lg text-xs">
            <span className="text-[10px] text-[#72777f] uppercase font-bold tracking-wider">Opened Date</span>
            <span className="text-[#151c27] font-medium">{account.openedDate}</span>
          </div>

          <div className="flex flex-col gap-0.5 bg-[#f0f3ff] p-3 rounded-lg text-xs">
            <span className="text-[10px] text-[#72777f] uppercase font-bold tracking-wider">Account ID</span>
            <div className="flex items-center justify-between">
              <span className="font-data-mono text-[#151c27] font-semibold truncate" title={account.id}>
                {account.id}
              </span>
              <button
                type="button"
                onClick={() => copyText(account.id, 'Account ID')}
                className="text-[#72777f] hover:text-[#002743]"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 bg-[#f0f3ff] p-3 rounded-lg text-xs">
            <span className="text-[10px] text-[#72777f] uppercase font-bold tracking-wider">IFSC Code</span>
            <div className="flex items-center justify-between">
              <span className="font-data-mono text-[#151c27] font-semibold">{account.ifscCode}</span>
              <button
                type="button"
                onClick={() => copyText(account.ifscCode, 'IFSC Code')}
                className="text-[#72777f] hover:text-[#002743]"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 bg-[#f0f3ff] p-3 rounded-lg text-xs">
            <span className="text-[10px] text-[#72777f] uppercase font-bold tracking-wider">Branch</span>
            <span className="text-[#151c27] font-medium truncate" title={account.branch}>
              {account.branch}
            </span>
          </div>
        </div>
      </section>

      {/* Governance bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#c2c7cf]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-lg bg-[#e2e8f8] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#002743] text-[18px]">verified_user</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#151c27] leading-tight">
              Account Management &amp; Security
            </span>
            <span className="text-xs text-[#72777f]">Tier-1 Corporate Governance &amp; Statements</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleStatement}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#e2e8f8] text-[#151c27] hover:bg-[#dce2f3] transition-colors text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Current Month Statement</span>
          </button>
          <button
            type="button"
            onClick={() => setShowFreezeModal(true)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              isFrozen
                ? 'bg-[#7ffc97]/40 text-[#005320] hover:bg-[#7ffc97]'
                : 'bg-[#ffdad6]/40 text-[#ba1a1a] hover:bg-[#ffdad6]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isFrozen ? 'lock_open' : 'lock'}
            </span>
            <span>{isFrozen ? 'Unfreeze account' : 'Freeze account'}</span>
          </button>
        </div>
      </div>

      {/* Statement summary (when requested) */}
      {statement && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#c2c7cf]/30 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#f0f3ff]">
            <div className="text-[10px] uppercase font-bold text-[#72777f]">Entry Count</div>
            <div className="text-base font-bold text-[#002743] mt-0.5">{statement.entryCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#f0f3ff]">
            <div className="text-[10px] uppercase font-bold text-[#72777f]">Total Credits</div>
            <div className="text-base font-bold text-[#00451a] mt-0.5">
              ₹{Number(statement.totalCredits).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#f0f3ff]">
            <div className="text-[10px] uppercase font-bold text-[#72777f]">Total Debits</div>
            <div className="text-base font-bold text-[#ba1a1a] mt-0.5">
              ₹{Number(statement.totalDebits).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#f0f3ff]">
            <div className="text-[10px] uppercase font-bold text-[#72777f]">Closing Balance</div>
            <div className="text-base font-bold text-[#002743] mt-0.5">
              ₹{Number(statement.closingBalance).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {/* Live in/out totals from THIS account's transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#72777f] uppercase font-bold tracking-wider">
              Inflow (loaded txns)
            </span>
            <span className="material-symbols-outlined text-[#72777f] text-[18px]">trending_up</span>
          </div>
          <div className="mt-2 text-lg font-bold text-[#00451a]">
            ₹{inflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#72777f] mt-1">
            Derived from {accountTransactions.filter((t) => t.direction === 'RECEIVED').length} credits
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#72777f] uppercase font-bold tracking-wider">
              Outflow (loaded txns)
            </span>
            <span className="material-symbols-outlined text-[#72777f] text-[18px]">trending_down</span>
          </div>
          <div className="mt-2 text-lg font-bold text-[#ba1a1a]">
            ₹{outflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#72777f] mt-1">
            Derived from {accountTransactions.filter((t) => t.direction === 'SENT').length} debits
          </div>
        </div>
      </div>

      {/* Transactions */}
      <section className="bg-white rounded-xl shadow-sm border border-[#c2c7cf]/30 overflow-hidden flex flex-col">
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-[#151c27]">Transactions</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#e2e8f8] text-[#42474e] font-semibold">
              {accountTransactions.length} records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 rounded-lg bg-[#f0f3ff] gap-1">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  filterType === 'all' ? 'bg-white text-[#002743] shadow-xs' : 'text-[#72777f] hover:text-[#151c27]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType('credits')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  filterType === 'credits' ? 'bg-white text-[#002743] shadow-xs' : 'text-[#72777f] hover:text-[#151c27]'
                }`}
              >
                Credits
              </button>
              <button
                type="button"
                onClick={() => setFilterType('debits')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  filterType === 'debits' ? 'bg-white text-[#002743] shadow-xs' : 'text-[#72777f] hover:text-[#151c27]'
                }`}
              >
                Debits
              </button>
            </div>

            <button
              type="button"
              onClick={() => showToast('Exporting transaction audit CSV...', 'info')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e2e8f8] text-[#151c27] hover:bg-[#dce2f3] transition-colors text-xs font-semibold"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#72777f] text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-6">Date &amp; Time</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Counterparty Account</th>
                <th className="py-3 px-6 text-right">Amount</th>
                <th className="py-3 px-6 text-right">Currency</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#f0f3ff]">
              {accountTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#72777f]">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[28px] text-[#c2c7cf]">receipt_long</span>
                      <span>No transactions involve this account yet.</span>
                    </div>
                  </td>
                </tr>
              )}
              {accountTransactions.map((tx, idx) => {
                const isDebit = tx.direction === 'SENT';
                return (
                  <tr
                    key={tx.id}
                    className={`${idx % 2 === 1 ? 'bg-[#f0f3ff]/30' : 'bg-white'} hover:bg-[#e2e8f8]/50 transition-colors`}
                  >
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#151c27]">{tx.date}</span>
                        <span className="text-[11px] text-[#72777f]">{tx.time}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-data-mono text-[#72777f] font-semibold">{tx.reference}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          isDebit ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#7ffc97] text-[#005320]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isDebit ? 'arrow_outward' : 'call_received'}
                        </span>
                        {isDebit ? 'DEBIT' : 'CREDIT'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#e7eefe] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[14px] text-[#72777f]">
                            {isDebit ? 'call_made' : 'arrow_downward'}
                          </span>
                        </div>
                        <span className="text-[#151c27] font-medium">
                          {isDebit ? `To: ${tx.toAccount}` : `From: ${tx.fromAccount}`}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`py-3.5 px-6 text-right whitespace-nowrap font-data-mono font-bold ${
                        isDebit ? 'text-[#ba1a1a]' : 'text-[#00451a]'
                      }`}
                    >
                      {isDebit ? '-' : '+'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap text-[#72777f]">
                      {tx.currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-[#f0f3ff] flex flex-col sm:flex-row items-center justify-between text-xs text-[#72777f] gap-2 border-t border-[#e2e8f8]">
          <span>
            Showing <strong className="text-[#151c27]">{accountTransactions.length}</strong> transactions
          </span>
          <span className="px-3 py-1 rounded bg-white text-[#151c27] font-semibold border border-[#c2c7cf]/40 shadow-xs">
            Page 1 of 1
          </span>
        </div>
      </section>

      {/* Freeze / Unfreeze confirmation */}
      {showFreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-[#c2c7cf]/40">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isFrozen ? 'bg-[#7ffc97]/40 text-[#005320]' : 'bg-[#ffdad6] text-[#ba1a1a]'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {isFrozen ? 'lock_open' : 'lock'}
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#002743]">
                  {isFrozen ? 'Unfreeze Account' : 'Freeze Account'}
                </h3>
                <span className="text-xs text-[#72777f]">
                  {isFrozen ? 'Restore normal operations' : 'Suspend all outbound facilities'}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#42474e] leading-relaxed mb-6">
              {isFrozen ? (
                <>
                  Unfreezing <strong className="font-data-mono text-[#151c27]">{account.maskedNumber}</strong> will
                  restore wire transfers, debit card processing, and clearing house sweeps. This action is immediate.
                </>
              ) : (
                <>
                  Freezing <strong className="font-data-mono text-[#151c27]">{account.maskedNumber}</strong> will
                  immediately suspend outbound wire transfers, debit card processing, and automated clearing house
                  sweeps. You can unfreeze at any time.
                </>
              )}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFreezeModal(false)}
                className="px-4 py-2 rounded-lg bg-[#e2e8f8] text-[#151c27] text-xs font-semibold hover:bg-[#dce2f3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFreezeToggle}
                disabled={busy}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-60 ${
                  isFrozen ? 'bg-[#005320] hover:bg-[#00451a]' : 'bg-[#ba1a1a] hover:bg-[#93000a]'
                }`}
              >
                {busy ? 'Processing…' : isFrozen ? 'Confirm Unfreeze' : 'Confirm Freeze'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};