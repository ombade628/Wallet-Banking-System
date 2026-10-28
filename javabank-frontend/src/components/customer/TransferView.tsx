import React, { useEffect, useState } from 'react';
import { useBanking } from '../../context/BankingContext';

export const TransferView: React.FC = () => {
  const {
    accounts,
    transferFunds,
    previewTransfer,
    lookupAccount,
    navigate,
    showToast,
  } = useBanking();

  const activeAccounts = accounts.filter((a) => a.status === 'active');

  const [activeTab, setActiveTab] = useState<'form' | 'success'>('form');

  const [fromAccountId, setFromAccountId] = useState<string>(activeAccounts[0]?.id || '');
  const [recipientAcc, setRecipientAcc] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAccountId, setRecipientAccountId] = useState<string | null>(null);
  const [isRecipientValid, setIsRecipientValid] = useState(false);
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fee, setFee] = useState(0);
  const [receipt, setReceipt] = useState<{
    reference: string;
    fromMasked: string;
    toName: string;
    toMasked: string;
    amount: number;
    fee: number;
    newBalance: number;
    timestamp: string;
  } | null>(null);

  const selectedFromAccount = accounts.find((a) => a.id === fromAccountId) || activeAccounts[0];
  const availableBal = selectedFromAccount ? selectedFromAccount.balance : 0;

  // Recompute fee whenever amount changes (backend endpoint /api/transfers/fee)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!amount || amount <= 0) {
        if (!cancelled) setFee(0);
        return;
      }
      try {
        const r = await previewTransfer(amount);
        if (!cancelled) setFee(r.fee);
      } catch {
        if (!cancelled) setFee(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [amount, previewTransfer]);

  // Auto-select first active account
  useEffect(() => {
    if (!fromAccountId && activeAccounts.length > 0) {
      setFromAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, fromAccountId]);

  const handleLookup = async () => {
    const trimmed = recipientAcc.trim();
    if (!trimmed) {
      showToast('Enter a recipient account number first.', 'error');
      return;
    }
    setIsLookingUp(true);
    setHasLookedUp(true);
    try {
      const found = await lookupAccount(trimmed);
      if (!found) {
        setIsRecipientValid(false);
        setRecipientAccountId(null);
        setRecipientName('');
        showToast('Account not found in core ledger.', 'error');
        return;
      }
      setIsRecipientValid(true);
      setRecipientAccountId(found.accountId);
      setRecipientName(found.ownerName);
      showToast(`Verified: ${found.ownerName}`, 'success');
    } catch (e: any) {
      setIsRecipientValid(false);
      setRecipientAccountId(null);
      setRecipientName('');
      showToast(e.response?.data?.message || 'Lookup failed', 'error');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!selectedFromAccount) {
      showToast('Select a source account first.', 'error');
      return;
    }
    if (!isRecipientValid || !recipientAccountId) {
      showToast('Verify the recipient account first.', 'error');
      return;
    }
    if (amount <= 0) {
      showToast('Enter a positive amount.', 'error');
      return;
    }
    if (amount + fee > availableBal) {
      showToast('Amount + fee exceeds available balance.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await transferFunds({
        fromAccountId: selectedFromAccount.id,
        toAccountNumber: recipientAcc.trim(),
        toName: recipientName,
        amount,
        note,
      });

      // Prefer backend's newFromBalance; fall back to computed
      const computedNewBalance =
        typeof res.newBalance === 'number' && res.newBalance > 0
          ? res.newBalance
          : Math.max(0, availableBal - amount - fee);

      setReceipt({
        reference: res.reference,
        fromMasked: `${selectedFromAccount.maskedNumber} (${selectedFromAccount.accountType})`,
        toName: recipientName,
        toMasked: `1000••••${recipientAcc.slice(-4)}`,
        amount,
        fee,
        newBalance: computedNewBalance,
        timestamp: new Date().toLocaleString('en-IN'),
      });
      setActiveTab('success');
      showToast('Transfer completed and settled.', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Transfer failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRecipientAcc('');
    setRecipientName('');
    setRecipientAccountId(null);
    setIsRecipientValid(false);
    setHasLookedUp(false);
    setAmount(0);
    setNote('');
    setFee(0);
    setReceipt(null);
    setActiveTab('form');
  };

  const copyRef = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    showToast(`Reference ${ref} copied!`, 'info');
  };

  const totalDebit = amount + fee;
  const insufficient = totalDebit > availableBal;
  const canSubmit =
    isRecipientValid && recipientAccountId && amount > 0 && !insufficient && !isSubmitting;

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-[#42474e]">
            <span>Banking</span>
            <span className="text-[#72777f]">/</span>
            <span className="text-[#002743] font-semibold">Transfer funds</span>
          </div>
          <h1 className="text-3xl text-[#002743] font-bold tracking-tight">Transfer Money</h1>
          <p className="text-sm text-[#42474e]">
            Instant domestic NEFT / IMPS transfers across JavaBank accounts.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#e2e8f8] p-1 rounded-lg self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`px-4 py-1.5 rounded text-xs transition-all ${
              activeTab === 'form'
                ? 'bg-white text-[#002743] shadow-sm font-bold'
                : 'text-[#42474e] hover:text-[#002743]'
            }`}
          >
            Initiate Form
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('success')}
            disabled={!receipt}
            className={`px-4 py-1.5 rounded text-xs transition-all ${
              activeTab === 'success'
                ? 'bg-white text-[#002743] shadow-sm font-bold'
                : 'text-[#42474e] hover:text-[#002743]'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Receipt
          </button>
        </div>
      </div>

      {/* FORM */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-[#c2c7cf]/30 flex flex-col gap-6">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f8]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#e7eefe] flex items-center justify-center text-[#002743]">
                    <span className="material-symbols-outlined text-[20px]">send_money</span>
                  </div>
                  <h2 className="text-lg font-bold text-[#002743]">Transfer Details</h2>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-[#00451a] bg-[#f0f3ff] px-3 py-1 rounded font-semibold border border-[#c2c7cf]/30">
                  <span className="w-2 h-2 rounded-full bg-[#3bbc5f]"></span>
                  IMPS 24x7 Active
                </span>
              </div>

              {/* From account */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#002743]" htmlFor="fromAccount">
                    From account <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <span className="text-xs text-[#42474e]">
                    Available:{' '}
                    <strong className="text-[#002743] font-bold">
                      ₹{availableBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </span>
                </div>
                <div className="relative">
                  <select
                    id="fromAccount"
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full h-12 bg-[#f0f3ff] rounded-lg px-3.5 pr-10 text-xs sm:text-sm font-semibold text-[#002743] appearance-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#005cab] cursor-pointer border border-[#c2c7cf]/40"
                  >
                    {activeAccounts.length === 0 && (
                      <option value="">No active accounts — create one first</option>
                    )}
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountType} · {a.maskedNumber} · ₹
                        {a.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#72777f]">
                    <span className="material-symbols-outlined text-[20px]">unfold_more</span>
                  </div>
                </div>
              </div>

              {/* To account */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#002743]" htmlFor="recipientAcc">
                    To account <span className="text-[#ba1a1a]">*</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="recipientAcc"
                      type="text"
                      value={recipientAcc}
                      onChange={(e) => {
                        setRecipientAcc(e.target.value);
                        setIsRecipientValid(false);
                        setRecipientAccountId(null);
                        setRecipientName('');
                        setHasLookedUp(false);
                      }}
                      placeholder="Enter recipient account number"
                      className="w-full h-12 bg-[#f0f3ff] rounded-lg pl-3.5 pr-10 font-data-mono text-sm text-[#002743] placeholder:text-[#72777f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#005cab] border border-[#c2c7cf]/40"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#72777f]">
                      <span className="material-symbols-outlined text-[18px]">dialpad</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={isLookingUp || !recipientAcc.trim()}
                    className="h-12 px-4 rounded-lg bg-[#e2e8f8] hover:bg-[#dce2f3] text-[#002743] text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isLookingUp ? 'animate-spin' : ''}`}>
                      {isLookingUp ? 'sync' : 'search'}
                    </span>
                    <span>{isLookingUp ? 'Checking…' : 'Look up'}</span>
                  </button>
                </div>

                {/* Recipient status */}
                {isRecipientValid ? (
                  <div className="flex items-center justify-between bg-[#f0f3ff] rounded-lg p-3 mt-1 border border-[#62df7d]/30">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white text-[#3bbc5f] flex items-center justify-center shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#002743]">{recipientName}</span>
                        <span className="text-[11px] text-[#42474e] font-data-mono">
                          1000••••{recipientAcc.slice(-4)}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[11px] bg-white text-[#3bbc5f] font-bold border border-[#62df7d]/40">
                      Verified
                    </span>
                  </div>
                ) : hasLookedUp && recipientAcc ? (
                  <div className="flex items-center justify-between bg-[#ffdad6]/40 rounded-lg p-3 mt-1 border border-[#ba1a1a]/30">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#ba1a1a]">Account not found</span>
                        <span className="text-[11px] text-[#42474e]">
                          No matching account in the ledger.
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[11px] bg-[#ffdad6] text-[#93000a] font-bold">
                      Failed
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#002743]" htmlFor="transferAmount">
                  Amount (₹) <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-2xl text-[#002743] font-bold select-none">
                    ₹
                  </span>
                  <input
                    id="transferAmount"
                    type="number"
                    min="1"
                    step="100"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full h-14 bg-[#f0f3ff] rounded-lg pl-10 pr-4 text-2xl text-[#002743] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#005cab] font-bold border border-[#c2c7cf]/40"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {[500, 1000, 5000, 10000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        amount === val
                          ? 'bg-[#002743] text-white'
                          : 'bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#151c27] border border-[#c2c7cf]/40'
                      }`}
                    >
                      ₹{val.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                {insufficient && (
                  <span className="text-[11px] text-[#ba1a1a] font-medium mt-1">
                    Amount + fee (₹
                    {totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) exceeds
                    available balance.
                  </span>
                )}
              </div>

              {/* Note */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#002743]" htmlFor="transferNote">
                    Note (optional)
                  </label>
                  <span className="text-[11px] text-[#72777f]">{note.length} / 140</span>
                </div>
                <input
                  id="transferNote"
                  type="text"
                  maxLength={140}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full h-12 bg-[#f0f3ff] rounded-lg px-3.5 text-xs sm:text-sm text-[#002743] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#005cab] border border-[#c2c7cf]/40"
                  placeholder="Payment remark or invoice reference"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f8]">
                <button
                  type="button"
                  onClick={() => navigate('dashboard')}
                  className="px-5 py-2 rounded-lg text-[#002743] hover:bg-[#f0f3ff] text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteTransfer}
                  disabled={!canSubmit}
                  className="px-6 py-2.5 rounded-lg bg-[#0a3d62] text-white hover:bg-[#002743] text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isSubmitting ? 'Processing…' : 'Confirm transfer'}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="bg-[#f0f3ff] rounded-xl p-4 flex items-start gap-3 border border-[#c2c7cf]/30">
              <div className="p-2 rounded bg-[#e7eefe] text-[#002743]">
                <span className="material-symbols-outlined text-[20px]">security</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[#002743] font-bold uppercase tracking-wider">
                  RBI Real-time Settlement Guarantee
                </span>
                <p className="text-xs text-[#42474e] mt-0.5 leading-relaxed">
                  IMPS transactions are processed under NPCI guidelines. Two-factor authentication token is
                  requested upon confirmation.
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-5 flex flex-col gap-4 sticky top-24">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f8]">
                <h3 className="text-base font-bold text-[#002743]">Transfer summary</h3>
                <span className="px-2.5 py-0.5 rounded bg-[#d4e3ff] text-[#004786] text-[10px] font-bold uppercase tracking-wider">
                  Instant IMPS
                </span>
              </div>

              <div className="flex flex-col gap-2 py-1 text-xs">
                <div className="flex items-center justify-between py-1.5 bg-[#f0f3ff]/60 px-3 rounded">
                  <span className="text-[#72777f] uppercase font-bold tracking-wider text-[10px]">From</span>
                  <span className="font-data-mono text-[#002743] font-semibold">
                    {selectedFromAccount
                      ? `${selectedFromAccount.accountType} (${selectedFromAccount.maskedNumber})`
                      : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 bg-[#f0f3ff]/60 px-3 rounded">
                  <span className="text-[#72777f] uppercase font-bold tracking-wider text-[10px]">To</span>
                  <span className="font-data-mono text-[#002743] font-semibold">
                    {isRecipientValid && recipientAcc
                      ? `${recipientName} (1000••••${recipientAcc.slice(-4)})`
                      : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 bg-[#f0f3ff]/60 px-3 rounded">
                  <span className="text-[#72777f] uppercase font-bold tracking-wider text-[10px]">Amount</span>
                  <span className="font-data-mono text-[#002743] font-bold">
                    ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 bg-[#f0f3ff]/60 px-3 rounded">
                  <span className="text-[#72777f] uppercase font-bold tracking-wider text-[10px]">Processing Fee</span>
                  <span className={`font-bold ${fee > 0 ? 'text-[#002743]' : 'text-[#3bbc5f]'}`}>
                    ₹{fee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="mt-1 p-3 bg-[#f0f3ff] rounded-lg flex items-center justify-between border border-[#c2c7cf]/40">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#72777f] uppercase font-bold">Total Debit</span>
                    <span className="text-[11px] text-[#72777f]">Amount + fee</span>
                  </div>
                  <span className="text-xl text-[#002743] font-bold font-data-mono">
                    ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#42474e] leading-relaxed">
                The request ID is generated on submit to prevent duplicate transfers.
              </p>

              <button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={!canSubmit}
                className="w-full h-12 rounded-lg bg-[#0a3d62] hover:bg-[#002743] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      fill="currentColor"
                    ></path>
                  </svg>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                )}
                <span>{isSubmitting ? 'Processing…' : 'Confirm transfer'}</span>
              </button>

              <div className="bg-[#ffdad6]/40 rounded-lg p-2.5 flex items-start gap-2 border border-[#ba1a1a]/30">
                <span className="material-symbols-outlined text-[#ba1a1a] text-[18px] shrink-0 mt-0.5">
                  warning
                </span>
                <span className="text-xs text-[#ba1a1a] font-medium leading-snug">
                  Double-check the recipient account number. Transfers cannot be reversed once cleared.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {activeTab === 'success' && receipt && (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6 py-4">
          <div className="w-full bg-white rounded-xl p-8 sm:p-12 shadow-sm border border-[#c2c7cf]/30 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-[#f0f3ff] border border-[#3bbc5f]/30 flex items-center justify-center text-[#3bbc5f] mb-4">
              <span className="material-symbols-outlined text-[44px]">check_circle</span>
            </div>
            <h2 className="text-2xl text-[#002743] font-bold">Transfer successful</h2>
            <p className="text-xs sm:text-sm text-[#42474e] max-w-md mt-1">
              Funds have been debited and settled via CBS Real-Time Clearing.
            </p>

            <div className="w-full bg-[#f0f3ff] rounded-xl p-6 flex flex-col gap-3 mt-6 text-left text-xs border border-[#c2c7cf]/30">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f8]">
                <span className="text-[11px] text-[#72777f] uppercase font-bold tracking-wider">
                  Reference
                </span>
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded font-data-mono text-[#002743] font-bold border border-[#c2c7cf]/40">
                  <span>{receipt.reference}</span>
                  <button
                    type="button"
                    onClick={() => copyRef(receipt.reference)}
                    className="text-[#005cab] hover:text-[#002743]"
                    title="Copy"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[#72777f] uppercase tracking-wider text-[10px] font-bold">From</span>
                <span className="text-[#002743] font-medium">{receipt.fromMasked}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[#72777f] uppercase tracking-wider text-[10px] font-bold">To</span>
                <span className="text-[#002743] font-medium">
                  {receipt.toName} · {receipt.toMasked}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[#72777f] uppercase tracking-wider text-[10px] font-bold">Amount</span>
                <span className="text-base text-[#002743] font-bold font-data-mono">
                  ₹{receipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[#72777f] uppercase tracking-wider text-[10px] font-bold">Fee</span>
                <span className="font-data-mono text-[#002743] font-semibold">
                  ₹{receipt.fee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[#72777f] uppercase tracking-wider text-[10px] font-bold">
                  New Source Balance
                </span>
                <span className="font-data-mono text-[#3bbc5f] font-bold text-sm">
                  ₹{receipt.newBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f8]">
                <span className="text-[#72777f] uppercase tracking-wider text-[10px] font-bold">
                  Date &amp; Time
                </span>
                <span className="text-[#002743] font-medium">{receipt.timestamp}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-6">
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:flex-1 h-12 rounded-lg bg-[#0a3d62] hover:bg-[#002743] text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                <span>Make another transfer</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('dashboard')}
                className="w-full sm:flex-1 h-12 rounded-lg bg-[#e2e8f8] hover:bg-[#dce2f3] text-[#002743] text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                <span>Back to dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};