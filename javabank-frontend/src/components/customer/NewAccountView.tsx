import React, { useState } from 'react';
import { useBanking } from '../../context/BankingContext';
import { AccountType } from '../../types';

export const NewAccountView: React.FC = () => {
  const { openNewAccount, activateAccount, navigate, showToast } = useBanking();
  const [accountType, setAccountType] = useState<AccountType | ''>('');
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<{
    id: string;
    accountNumber: string;
    maskedNumber: string;
    accountType: AccountType;
    currency: string;
  } | null>(null);
  const [activating, setActivating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountType || loading) return;

    setLoading(true);
    try {
      const acc = await openNewAccount(accountType as AccountType, currency);
      setCreatedAccount({
        id: acc.id,
        accountNumber: acc.accountNumber,
        maskedNumber: acc.maskedNumber,
        accountType: acc.accountType,
        currency: acc.currency,
      });
      showToast(`Account ${acc.maskedNumber} created (pending activation).`, 'success');
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Account creation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!createdAccount || activating) return;
    setActivating(true);
    try {
      await activateAccount(createdAccount.id);
      showToast('Account activated. You can now transfer funds.', 'success');
      setCreatedAccount(null);
      navigate('accounts');
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Activation failed', 'error');
    } finally {
      setActivating(false);
    }
  };

  const handleFinishWithoutActivating = () => {
    setCreatedAccount(null);
    navigate('accounts');
  };

  const handleReset = () => {
    setAccountType('');
    setCurrency('INR');
    setCreatedAccount(null);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex items-center gap-1.5 text-xs text-[#72777f]">
          <button
            type="button"
            onClick={() => navigate('accounts')}
            className="hover:text-[#002743] transition-colors"
          >
            Accounts
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#151c27] font-semibold">New account</span>
        </nav>
        <div className="flex items-center gap-1.5 text-[#72777f] font-data-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-[#0075d6] animate-pulse"></span>
          <span>CBS API · Connected</span>
        </div>
      </div>

      <div className="flex justify-center items-start w-full py-4">
        <div className="w-full max-w-[560px] bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#c2c7cf]/30 p-6 sm:p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-1 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#005cab] font-bold">
                Provisioning Module
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs bg-[#e7eefe] text-[#42474e] font-medium">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Tier-1 Custody
              </span>
            </div>
            <h1 className="text-2xl text-[#002743] font-bold tracking-tight mt-1">
              {createdAccount ? 'Account created' : 'Open a new account'}
            </h1>
            <p className="text-xs sm:text-sm text-[#42474e] leading-relaxed">
              {createdAccount
                ? 'Your account has been provisioned. Activate it to begin using it.'
                : 'Choose the account product and base currency for your corporate depository portfolio.'}
            </p>
          </div>

          {/* Success screen */}
          {createdAccount ? (
            <div className="flex flex-col gap-5">
              <div className="p-4 rounded-lg bg-[#F0FDF4] border border-[#16A34A]/30 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#16A34A] text-[26px] shrink-0">
                  check_circle
                </span>
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-sm text-[#002c0e]">Account {createdAccount.maskedNumber} provisioned</span>
                  <span className="text-[#42474e] mt-0.5">
                    Full number: <strong className="font-data-mono text-[#002743]">{createdAccount.accountNumber}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#f0f3ff]">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-[#72777f]">Type</div>
                  <div className="font-bold text-[#002743] mt-0.5">{createdAccount.accountType}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#f0f3ff]">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-[#72777f]">Currency</div>
                  <div className="font-bold text-[#002743] mt-0.5">{createdAccount.currency}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#f0f3ff] border border-[#c2c7cf]/30 flex items-start gap-3 text-xs text-[#42474e]">
                <span className="material-symbols-outlined text-[#005cab] text-[20px] shrink-0 mt-0.5">
                  info
                </span>
                <span className="leading-relaxed">
                  New accounts start in <strong className="text-[#151c27]">PENDING</strong> status. Activate now to
                  enable transfers and deposits, or wait for compliance review.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleFinishWithoutActivating}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold text-[#42474e] hover:bg-[#e2e8f8] transition-colors"
                >
                  Done (keep pending)
                </button>
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={activating}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#0a3d62] text-white text-xs font-semibold hover:bg-[#002743] transition-colors shadow-sm disabled:opacity-60 min-w-[150px] h-11"
                >
                  {activating ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          fill="currentColor"
                        ></path>
                      </svg>
                      <span>Activating…</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check</span>
                      <span>Activate now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Account type */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-xs font-semibold text-[#151c27] flex items-center justify-between"
                    htmlFor="accountType"
                  >
                    <span>
                      Account type <span className="text-[#ba1a1a]">*</span>
                    </span>
                    <span className="text-[11px] text-[#72777f] font-normal">Regulatory category</span>
                  </label>
                  <div className="relative">
                    <select
                      id="accountType"
                      required
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as AccountType)}
                      className="w-full h-12 pl-3.5 pr-10 rounded-lg bg-white text-[#151c27] text-sm border border-[#c2c7cf] appearance-none focus:outline-none focus:border-[#005cab] focus:ring-2 focus:ring-[#005cab]/20 transition-all cursor-pointer font-medium"
                    >
                      <option value="" disabled hidden>
                        Select corporate account tier
                      </option>
                      <option value="SAVINGS">SAVINGS — Corporate High-Yield Savings</option>
                      <option value="CHECKING">CHECKING — Commercial Operating &amp; Payroll</option>
                      <option value="BUSINESS">BUSINESS — Treasury &amp; Multi-Entity Cash Pool</option>
                      <option value="FIXED_DEPOSIT">FIXED_DEPOSIT — Term Deposit with Guaranteed Yield</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#72777f]">
                      <span className="material-symbols-outlined text-[20px]">arrow_drop_down</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#72777f]">
                    Interest payout, liquidity thresholds, and ledger fees will be applied per corporate charter.
                  </p>
                </div>

                {/* Currency */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-xs font-semibold text-[#151c27] flex items-center justify-between"
                    htmlFor="currencySelect"
                  >
                    <span>
                      Currency <span className="text-[#ba1a1a]">*</span>
                    </span>
                    <span className="text-[11px] text-[#72777f] font-normal">Settlement denomination</span>
                  </label>
                  <div className="relative">
                    <select
                      id="currencySelect"
                      required
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-12 pl-3.5 pr-10 rounded-lg bg-white text-[#151c27] text-sm border border-[#c2c7cf] appearance-none focus:outline-none focus:border-[#005cab] focus:ring-2 focus:ring-[#005cab]/20 transition-all cursor-pointer font-medium"
                    >
                      <option value="INR">INR — Indian Rupee (₹)</option>
                      <option value="USD">USD — US Dollar ($)</option>
                      <option value="EUR">EUR — Euro (€)</option>
                      <option value="GBP">GBP — British Pound (£)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#72777f]">
                      <span className="material-symbols-outlined text-[20px]">arrow_drop_down</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#72777f]">
                    Foreign currency depository balances are secured under standard RBI/FEMA offshore provisions.
                  </p>
                </div>

                {/* Provisioning info */}
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#e2e8f8]/60 text-[#151c27] border border-[#c2c7cf]/30">
                  <span className="material-symbols-outlined text-[#005cab] text-[20px] shrink-0 mt-0.5">info</span>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-semibold text-[#002743]">Automated Account Number Generation</span>
                    <span className="text-[#42474e] leading-relaxed">
                      Account number and settlement routing will be generated automatically on submit.
                    </span>
                  </div>
                </div>

                {/* Verification status */}
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#f0f3ff] text-[#151c27] border border-[#c2c7cf]/30">
                  <span className="material-symbols-outlined text-[#72777f] text-[20px] shrink-0 mt-0.5">verified_user</span>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold uppercase tracking-wider text-[#151c27]">
                        Verification Status
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-[#d4e3ff] text-[#004786] font-bold uppercase tracking-wide">
                        Pending Review
                      </span>
                    </div>
                    <span className="text-[#72777f] leading-relaxed mt-0.5">
                      New accounts start in <span className="font-semibold text-[#151c27]">PENDING</span> status. You can
                      activate immediately after creation, or wait for compliance review.
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-lg text-xs font-semibold text-[#42474e] hover:bg-[#e2e8f8] transition-colors disabled:opacity-60"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !accountType}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#0a3d62] text-white text-xs font-semibold hover:bg-[#002743] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed min-w-[150px] h-11"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            fill="currentColor"
                          ></path>
                        </svg>
                        <span>Provisioning...</span>
                      </>
                    ) : (
                      <span>Create account</span>
                    )}
                  </button>
                </div>
              </form>

              <div className="pt-4 border-t border-[#e7eefe] flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#72777f]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">account_balance</span>
                  <span>JavaBank Corporate Custody</span>
                </div>
                <span>API: POST /api/accounts</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};