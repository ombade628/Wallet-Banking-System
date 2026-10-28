import React, { useState } from 'react';
import { useBanking } from '../../context/BankingContext';

export const AccountsView: React.FC = () => {
  const { accounts, navigate, setSelectedAccountId, showToast } = useBanking();
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [showRatesModal, setShowRatesModal] = useState(false);

  const filteredAccounts = accounts.filter((acc) => {
    if (filter === 'all') return true;
    return acc.status === filter;
  });

  const totalHoldings = accounts
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + a.balance, 0);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    showToast(`Account number ${text} copied to clipboard!`, 'info');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 flex flex-col gap-6">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-[#72777f]">
            <span>Banking</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#151c27] font-medium">Depository Accounts</span>
          </div>
          <h1 className="text-3xl text-[#002743] font-bold tracking-tight mt-1">Accounts</h1>
          <p className="text-sm text-[#42474e]">Overview of your corporate and personal depository accounts.</p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            type="button"
            onClick={() => navigate('new-account')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a3d62] text-white hover:bg-[#002743] transition-colors shadow-sm text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New account</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics & Quick Filter Strip */}
      <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#c2c7cf]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#e7eefe]">
            <span className="material-symbols-outlined text-[#005cab] text-[20px]">account_balance_wallet</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] text-[#72777f] uppercase font-bold tracking-wider">Active Holdings:</span>
              <span className="text-base text-[#151c27] font-bold tracking-tight">
                ₹{totalHoldings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[11px] text-[#42474e] px-2 py-0.5 rounded bg-[#dce2f3] font-semibold">
              {accounts.length} Accounts
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#72777f]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#62df7d]"></span>
            <span>Real-time sync active (CBS India)</span>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1 bg-[#f0f3ff] p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-1 rounded text-xs transition-all ${
              filter === 'all'
                ? 'bg-white text-[#002743] font-bold shadow-sm'
                : 'text-[#42474e] hover:text-[#151c27]'
            }`}
          >
            All ({accounts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-4 py-1 rounded text-xs transition-all ${
              filter === 'active'
                ? 'bg-white text-[#002743] font-bold shadow-sm'
                : 'text-[#42474e] hover:text-[#151c27]'
            }`}
          >
            Active ({accounts.filter((a) => a.status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-4 py-1 rounded text-xs transition-all ${
              filter === 'pending'
                ? 'bg-white text-[#002743] font-bold shadow-sm'
                : 'text-[#42474e] hover:text-[#151c27]'
            }`}
          >
            Pending ({accounts.filter((a) => a.status === 'pending').length})
          </button>
        </div>
      </div>

      {/* Accounts grid */}
      {filteredAccounts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-[#c2c7cf]/30 text-center">
          <div className="w-14 h-14 rounded-full bg-[#f0f3ff] mx-auto flex items-center justify-center text-[#72777f] mb-3">
            <span className="material-symbols-outlined text-[28px]">account_balance</span>
          </div>
          <h3 className="text-base font-bold text-[#151c27]">No accounts match this filter</h3>
          <p className="text-xs text-[#42474e] mt-1 max-w-sm mx-auto">
            Try a different filter, or open a new account to begin banking.
          </p>
          <button
            type="button"
            onClick={() => navigate('new-account')}
            className="mt-4 px-4 py-2 rounded-lg bg-[#0a3d62] text-white text-xs font-semibold hover:bg-[#002743]"
          >
            New account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {filteredAccounts.map((account) => {
            const isPending = account.status === 'pending';
            const isFrozen = account.status === 'frozen';
            const isSavings = account.accountType === 'SAVINGS';
            const isChecking = account.accountType === 'CHECKING';
            const isFD = account.accountType === 'FIXED_DEPOSIT';

            return (
              <div
                key={account.id}
                className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#c2c7cf]/30 flex flex-col justify-between transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${
                        isSavings
                          ? 'bg-[#d4e3ff] text-[#004786]'
                          : isChecking
                          ? 'bg-[#EEF2FF] text-[#3730A3]'
                          : isFD
                          ? 'bg-[#F3E8FF] text-[#7E22CE]'
                          : 'bg-[#e7eefe] text-[#002743]'
                      }`}
                    >
                      {account.accountType}
                    </span>

                    {isPending ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] bg-[#FEF3C7] text-[#B45309] font-bold">
                        <span className="material-symbols-outlined text-[14px]">pending</span>
                        PENDING
                      </span>
                    ) : isFrozen ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] bg-[#ffdad6] text-[#ba1a1a] font-bold">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        FROZEN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] bg-[#DCFCE7] text-[#15803D] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span>
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Account number */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-data-mono text-sm text-[#42474e]">{account.maskedNumber}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(account.accountNumber)}
                        className="text-[#72777f] hover:text-[#002743] transition-colors p-0.5"
                        title="Copy Account Number"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                    </div>
                    <span className="material-symbols-outlined text-[#72777f] text-[20px]">
                      {isSavings ? 'savings' : isChecking ? 'payments' : 'lock_clock'}
                    </span>
                  </div>

                  {/* Balance */}
                  <div className="mt-4 pb-4">
                    <div className="text-3xl text-[#151c27] font-bold tracking-tight">
                      ₹{account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-[#72777f] mt-0.5">{account.currency} · {account.currency === 'INR' ? 'Indian Rupee' : account.currency}</div>
                  </div>

                  {/* Specifics */}
                  <div className="bg-[#f0f3ff] rounded-lg p-3 flex flex-col gap-1.5 text-xs">
                    {isSavings && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[#72777f]">Interest Accrual</span>
                          <span className="text-[#151c27] font-semibold">{account.interestRate || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#72777f]">IFSC Code</span>
                          <span className="font-data-mono text-[#151c27]">{account.ifscCode}</span>
                        </div>
                      </>
                    )}
                    {isChecking && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[#72777f]">Overdraft Protection</span>
                          <span className="text-[#151c27] font-semibold">
                            {account.overdraftLimit
                              ? `₹${account.overdraftLimit.toLocaleString('en-IN')} Limit`
                              : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#72777f]">IFSC Code</span>
                          <span className="font-data-mono text-[#151c27]">{account.ifscCode}</span>
                        </div>
                      </>
                    )}
                    {isFD && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[#72777f]">Maturity Date</span>
                          <span className="text-[#151c27] font-semibold">
                            {account.maturityDate || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#72777f]">IFSC Code</span>
                          <span className="font-data-mono text-[#151c27]">{account.ifscCode}</span>
                        </div>
                      </>
                    )}
                    {!isSavings && !isChecking && !isFD && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#72777f]">IFSC Code</span>
                        <span className="font-data-mono text-[#151c27]">{account.ifscCode}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 flex items-center justify-between gap-3 border-t border-[#f0f3ff]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAccountId(account.id);
                      navigate('account-detail');
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-[#002743] hover:bg-[#e2e8f8] transition-colors text-xs font-semibold"
                  >
                    View details
                  </button>

                  {isPending || isFrozen ? (
                    <button
                      disabled
                      type="button"
                      title={isPending ? 'Pending verification' : 'Account frozen'}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#e2e8f8] text-[#72777f] cursor-not-allowed text-xs font-medium"
                    >
                      <span>Transfer</span>
                      <span className="material-symbols-outlined text-[16px]">
                        {isFrozen ? 'lock' : 'lock'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate('transfer')}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#e7eefe] text-[#151c27] hover:bg-[#cfe5ff] transition-colors text-xs font-semibold"
                    >
                      <span>Transfer</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supplementary CTA */}
      <div className="mt-4 bg-white rounded-xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#c2c7cf]/30 flex flex-col items-center text-center max-w-2xl mx-auto w-full">
        <div className="w-14 h-14 rounded-full bg-[#e2e8f8] flex items-center justify-center text-[#0a3d62] mb-3">
          <span className="material-symbols-outlined text-[28px]">account_balance</span>
        </div>
        <h2 className="text-lg font-bold text-[#151c27]">Expand Your Financial Portfolio</h2>
        <p className="text-xs sm:text-sm text-[#42474e] max-w-md mt-1">
          Open high-yield term deposits, tax-saving schemes, or multi-currency business accounts instantly with digital KYC.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
          <button
            type="button"
            onClick={() => navigate('new-account')}
            className="px-5 py-2.5 rounded-lg bg-[#002743] text-white hover:bg-[#0a3d62] transition-colors text-xs font-semibold shadow-sm"
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => setShowRatesModal(true)}
            className="px-4 py-2.5 rounded-lg text-[#002743] hover:bg-[#e7eefe] transition-colors text-xs font-semibold"
          >
            Compare interest rates
          </button>
        </div>
      </div>

      {/* Compare Rates — clearly labelled illustrative */}
      {showRatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 border border-[#c2c7cf]/40">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f8]">
              <h3 className="text-base font-bold text-[#002743]">JavaBank Depository Rate Card</h3>
              <button
                type="button"
                onClick={() => setShowRatesModal(false)}
                className="text-[#72777f] hover:text-[#151c27]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-[11px] text-[#72777f] pt-2">
              Illustrative rates — actual accrual is applied per account charter and confirmed on the account detail page.
            </p>
            <div className="py-3 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#f0f3ff]">
                <div>
                  <span className="font-bold text-[#002743] block">Corporate High-Yield Savings</span>
                  <span className="text-[#72777f]">Daily compounding, instant liquidity</span>
                </div>
                <span className="font-bold text-[#005cab] text-sm">4.50% p.a.</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#f0f3ff]">
                <div>
                  <span className="font-bold text-[#002743] block">12-Month Term Fixed Deposit</span>
                  <span className="text-[#72777f]">Senior &amp; institutional prime bonus</span>
                </div>
                <span className="font-bold text-[#005cab] text-sm">6.85% p.a.</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#f0f3ff]">
                <div>
                  <span className="font-bold text-[#002743] block">24-Month Long-Term Fixed Deposit</span>
                  <span className="text-[#72777f]">Guaranteed DICGC insured yield</span>
                </div>
                <span className="font-bold text-[#005cab] text-sm">7.20% p.a.</span>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRatesModal(false)}
                className="px-4 py-2 rounded-lg bg-[#002743] text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};