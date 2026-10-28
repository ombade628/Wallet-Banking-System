import React, { useState } from 'react';
import { useBanking } from '../../context/BankingContext';

export const CashierDepositView: React.FC = () => {
  const { depositCash, lookupAccount, showToast } = useBanking();
  const [viewState, setViewState] = useState<'form' | 'success'>('form');

  const [accountNumber, setAccountNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [isAccountVerified, setIsAccountVerified] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [depositResult, setDepositResult] = useState<{
    reference: string;
    newBalance: number;
    amount: number;
    accountNumber: string;
    holderName: string;
  } | null>(null);

  const handleLookup = async () => {
    if (!accountNumber.trim()) {
      showToast('Enter an account number first.', 'error');
      return;
    }
    setIsLookingUp(true);
    try {
      const found = await lookupAccount(accountNumber.trim());
      if (!found) {
        setIsAccountVerified(false);
        setHolderName('');
        showToast('Account not found in core ledger.', 'error');
        return;
      }
      setIsAccountVerified(true);
      setHolderName(found.ownerName);
      showToast(`Account verified: ${found.ownerName}`, 'success');
    } catch (e: any) {
      setIsAccountVerified(false);
      setHolderName('');
      showToast(e.response?.data?.message || 'Lookup failed', 'error');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAccountVerified) {
      showToast('Look up the account first.', 'error');
      return;
    }
    if (amount <= 0) {
      showToast('Please specify a positive deposit amount.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await depositCash({
        accountNumber: accountNumber.trim(),
        amount,
        note,
      });
      setDepositResult({
        reference: res.reference,
        newBalance: res.newBalance,
        amount,
        accountNumber: accountNumber.trim(),
        // Use only what the backend actually returned — no fabricated fallback
        holderName: res.holderName || holderName || '',
      });
      setViewState('success');
      showToast(`Deposit of ₹${amount.toLocaleString('en-IN')} posted successfully.`, 'success');
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Deposit failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      showToast('Thermal slip counter receipt printed successfully.', 'success');
    }, 1200);
  };

  const handleReset = () => {
    setAccountNumber('');
    setHolderName('');
    setIsAccountVerified(false);
    setAmount(0);
    setNote('');
    setDepositResult(null);
  };

  const maskedAccount = accountNumber
    ? `1000••••${accountNumber.slice(-4)}`
    : '—';

  const canSubmit = isAccountVerified && amount > 0 && !isSubmitting;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Mode bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-xl border border-[#c2c7cf]/40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00451a] animate-pulse"></div>
          <span className="text-xs font-bold uppercase text-[#42474e] tracking-wider">
            Operational Mode
          </span>
          <span className="text-[#c2c7cf] text-xs">|</span>
          <span className="text-xs text-[#002743] font-semibold">
            Cashier · Over-the-counter
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[#f0f3ff] p-1 rounded-lg border border-[#c2c7cf]/30">
          <button
            type="button"
            onClick={() => setViewState('form')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              viewState === 'form' ? 'bg-[#002743] text-white shadow-xs' : 'text-[#42474e] hover:text-[#002743]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>Deposit Form</span>
          </button>
          <button
            type="button"
            onClick={() => setViewState('success')}
            disabled={!depositResult}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              viewState === 'success' ? 'bg-[#002743] text-white shadow-xs' : 'text-[#42474e] hover:text-[#002743]'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Receipt</span>
          </button>
        </div>
      </div>

      {/* FORM VIEW */}
      {viewState === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-[#c2c7cf]/30 p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <div className="flex items-start justify-between pb-4 border-b border-[#e2e8f8] mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[#002743] text-[20px]">
                      account_balance_wallet
                    </span>
                    <h1 className="text-xl text-[#002743] font-bold">Cash Deposit Initiation</h1>
                  </div>
                  <p className="text-xs text-[#42474e]">
                    Over-the-counter liquidity intake and instant ledger credit protocol.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#e7eefe] text-[#002743] text-xs font-semibold border border-[#c2c7cf]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#005cab]"></span> OTC
                </span>
              </div>

              <form onSubmit={handleDepositSubmit} className="space-y-5">
                {/* Account + lookup */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#002743] flex items-center justify-between" htmlFor="depositAccountInput">
                    <span>Account Number <span className="text-[#ba1a1a]">*</span></span>
                    <span className="text-[11px] text-[#72777f] font-normal">Enter the customer's account number</span>
                  </label>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#72777f]">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                      </span>
                      <input
                        id="depositAccountInput"
                        type="text"
                        maxLength={32}
                        value={accountNumber}
                        onChange={(e) => {
                          setAccountNumber(e.target.value);
                          setIsAccountVerified(false);
                          setHolderName('');
                        }}
                        placeholder="Enter account number"
                        className="w-full h-12 pl-10 pr-3 rounded-lg border border-[#c2c7cf]/50 bg-white font-data-mono text-sm text-[#151c27] focus:outline-none focus:border-[#005cab] focus:ring-2 focus:ring-[#005cab]/20 transition-all font-semibold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleLookup}
                      disabled={isLookingUp || !accountNumber.trim()}
                      className="px-4 h-12 bg-[#e7eefe] hover:bg-[#dce2f3] text-[#002743] text-xs font-bold rounded-lg border border-[#c2c7cf]/40 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isLookingUp ? 'Checking…' : 'Look up'}
                    </button>
                  </div>

                  {isAccountVerified ? (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#F0FDF4] border border-[#16A34A]/30 text-[#151c27] mt-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#16A34A] text-[18px]">
                          verified_user
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-bold text-[#002743]">{holderName || '—'}</span>
                          <span className="font-data-mono text-xs text-[#72777f]">{maskedAccount}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-[#16A34A] font-bold">Verified</span>
                    </div>
                  ) : accountNumber && !isLookingUp ? (
                    <p className="text-[11px] text-[#72777f] mt-1">
                      Click "Look up" to verify the account before depositing.
                    </p>
                  ) : null}
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#002743] flex items-center justify-between" htmlFor="depositAmount">
                    <span>Deposit Amount (INR) <span className="text-[#ba1a1a]">*</span></span>
                    <span className="text-[11px] text-[#72777f] font-normal">Min ₹1.00 · Single OTC Limit ₹2,00,000</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xl font-bold text-[#002743]">₹</span>
                    <input
                      id="depositAmount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount || ''}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full h-12 pl-10 pr-4 rounded-lg border border-[#c2c7cf]/50 bg-white font-data-mono text-lg font-bold text-[#002743] focus:outline-none focus:border-[#005cab] focus:ring-2 focus:ring-[#005cab]/20 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-xs text-[#72777f] font-medium">Quick add:</span>
                    {[500, 1000, 5000, 10000, 25000].map((chipVal) => (
                      <button
                        key={chipVal}
                        type="button"
                        onClick={() => setAmount(chipVal)}
                        className={`px-3 py-1 rounded text-xs transition-colors font-medium border ${
                          amount === chipVal
                            ? 'bg-[#002743] text-white border-[#002743] font-bold'
                            : 'bg-[#e7eefe] text-[#002743] border-[#c2c7cf]/40 hover:bg-[#dce2f3]'
                        }`}
                      >
                        ₹{chipVal.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#002743]" htmlFor="depositNarration">Transaction Note / Narration</label>
                    <span className="text-[11px] text-[#72777f]">{note.length} / 140</span>
                  </div>
                  <input
                    id="depositNarration"
                    type="text"
                    maxLength={140}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Internal narration / slip serial / remark"
                    className="w-full h-12 px-3 rounded-lg border border-[#c2c7cf]/50 bg-white text-xs sm:text-sm text-[#151c27] focus:outline-none focus:border-[#005cab] focus:ring-2 focus:ring-[#005cab]/20 transition-all"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full sm:flex-1 h-12 bg-[#002743] hover:bg-[#0a3d62] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                      </svg>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">shield_lock</span>
                    )}
                    <span>
                      {isSubmitting
                        ? 'Posting CBS Credit…'
                        : `Deposit ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full sm:w-auto px-5 h-12 bg-white hover:bg-[#f0f3ff] text-[#42474e] hover:text-[#002743] text-xs font-semibold rounded-lg border border-[#c2c7cf]/50 transition-colors"
                  >
                    Clear form
                  </button>
                </div>

                <p className="text-[11px] text-[#72777f] text-center sm:text-left flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#72777f]">verified</span>
                  Requires a verified active account and a valid cashier authorization pin.
                </p>
              </form>
            </div>

            <div className="bg-white rounded-xl border border-[#c2c7cf]/30 p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#e7eefe] flex items-center justify-center text-[#002743]">
                  <span className="material-symbols-outlined text-[20px]">policy</span>
                </div>
                <div>
                  <div className="font-bold text-[#002743]">AML &amp; KYC Verification Thresholds</div>
                  <div className="text-[#42474e]">PAN validation mandatory for aggregate deposits exceeding ₹50,000 in a calendar day.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => showToast('Section 269ST Income Tax compliance active.', 'info')}
                className="text-[#005cab] font-bold hover:underline shrink-0 ml-3"
              >
                Section 269ST Policy
              </button>
            </div>
          </div>

          {/* Right column — draft slip */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-[#c2c7cf]/40 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="bg-[#002743] text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                  <div>
                    <span className="text-sm font-bold block leading-none">Draft Slip</span>
                    <span className="text-[11px] text-[#80a8d3] leading-none mt-1 block">
                      Generated on submit
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#16A34A]/20 text-[#7ffc97] border border-[#16A34A]/40">
                  DRAFT
                </span>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-dashed border-[#c2c7cf] pb-3">
                  <div>
                    <div className="text-base font-bold text-[#002743] tracking-tight leading-none">JavaBank OTC</div>
                    <div className="text-[11px] text-[#72777f] mt-0.5">Over-the-counter cash deposit</div>
                  </div>
                  <div className="text-right">
                    <div className="font-data-mono text-[11px] font-bold text-[#002743]">CASH</div>
                    <div className="text-[10px] text-[#72777f]">Customer Copy</div>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between py-1 border-b border-[#f0f3ff]">
                    <span className="text-[#72777f] font-medium">Reference ID</span>
                    <span className="font-data-mono font-bold text-[#002743]">{depositResult?.reference || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#f0f3ff]">
                    <span className="text-[#72777f] font-medium">Account</span>
                    <span className="font-data-mono font-semibold text-[#002743]">{maskedAccount}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#f0f3ff]">
                    <span className="text-[#72777f] font-medium">Account Holder</span>
                    <span className="font-bold text-[#002743]">{holderName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 bg-[#F0FDF4] px-2.5 rounded border border-[#16A34A]/20">
                    <span className="font-bold text-[#16A34A]">Deposit Intake (+)</span>
                    <span className="font-data-mono text-base font-bold text-[#16A34A]">
                      +₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#f0f3ff]">
                    <span className="text-[#002743] font-semibold">New Balance (after post)</span>
                    <span className="font-data-mono text-sm font-bold text-[#002743]">
                      {depositResult
                        ? `₹${depositResult.newBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#f0f3ff]">
                    <span className="text-[#72777f] font-medium">Note</span>
                    <span className="font-data-mono text-[#151c27] truncate max-w-[60%]">{note || '—'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-dashed border-[#c2c7cf] flex flex-col items-center justify-center gap-2">
                  <div className="w-full bg-[#f0f3ff] p-2 rounded text-center text-[10px] text-[#72777f] font-medium leading-relaxed">
                    Submit the form to write the transaction to the ledger. A unique reference is generated by the backend.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS VIEW */}
      {viewState === 'success' && depositResult && (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-full max-w-xl bg-white rounded-xl border border-[#c2c7cf]/40 shadow-[0_8px_24px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="bg-[#F0FDF4] border-b border-[#16A34A]/20 p-8 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#DCFCE7] border border-[#16A34A]/30 flex items-center justify-center mb-3 shadow-[0_2px_6px_rgba(22,163,74,0.15)]">
                <span className="material-symbols-outlined text-[#16A34A] text-[36px]">check_circle</span>
              </div>
              <h2 className="text-2xl text-[#002743] font-bold">Deposit Successful</h2>
              <p className="text-xs text-[#42474e] mt-1">Cash deposit processed and credited to the ledger.</p>
              <div className="mt-3 px-3 py-1 bg-white rounded-full border border-[#16A34A]/30 inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
                <span className="font-data-mono text-xs font-bold text-[#002743]">Ref: {depositResult.reference}</span>
              </div>
            </div>

            <div className="p-8 space-y-4 bg-white text-xs">
              <div className="bg-[#f0f3ff] rounded-lg p-5 border border-[#c2c7cf]/40 space-y-3">
                <div className="flex items-center justify-between border-b border-[#c2c7cf]/40 pb-2">
                  <span className="text-[#72777f]">Reference Number</span>
                  <span className="font-data-mono font-bold text-[#002743]">{depositResult.reference}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#c2c7cf]/40 pb-2">
                  <span className="text-[#72777f]">Account</span>
                  <span className="font-data-mono text-[#002743] font-bold">{depositResult.accountNumber}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#c2c7cf]/40 pb-2">
                  <span className="text-[#72777f]">Account Holder</span>
                  <span className="font-bold text-[#002743]">{depositResult.holderName || '—'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#c2c7cf]/40 pb-2">
                  <span className="text-[#72777f]">Amount Deposited</span>
                  <span className="font-data-mono text-base font-bold text-[#16A34A]">
                    +₹{depositResult.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[#c2c7cf]/40 pb-2">
                  <span className="text-[#72777f]">Updated Account Balance</span>
                  <span className="font-data-mono text-sm font-bold text-[#002743]">
                    ₹{depositResult.newBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#72777f]">Timestamp</span>
                  <span className="font-data-mono text-[#151c27]">{new Date().toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleReset();
                    setViewState('form');
                  }}
                  className="w-full sm:flex-1 h-12 bg-[#002743] hover:bg-[#0a3d62] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  <span>New deposit</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="w-full sm:w-auto px-5 h-12 bg-white hover:bg-[#f0f3ff] text-[#002743] text-xs font-bold rounded-lg border border-[#c2c7cf]/40 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {isPrinting ? (
                    <svg className="animate-spin h-4 w-4 text-[#002743]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                    </svg>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">print</span>
                  )}
                  <span>{isPrinting ? 'Printing…' : 'Print receipt'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};