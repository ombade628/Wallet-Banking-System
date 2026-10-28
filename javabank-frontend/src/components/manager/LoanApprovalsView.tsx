import React, { useMemo, useState } from 'react';
import { useBanking } from '../../context/BankingContext';
import { LoanApplication } from '../../types';

type Tab = 'all' | 'pending' | 'approved' | 'disbursed';

// ---------------------------------------------------------------------------
// Presentational step (workflow stepper)
// ---------------------------------------------------------------------------
const Step: React.FC<{
  done?: boolean;
  active?: boolean;
  label: string;
  detail: string;
}> = ({ done, active, label, detail }) => {
  const circle = done
    ? 'bg-[#16A34A] text-white'
    : active
    ? 'bg-[#D97706] text-white animate-pulse'
    : 'bg-[#e2e8f8] text-[#72777f]';
  const icon = done ? 'check' : active ? 'sync' : 'circle';
  const titleColor = active ? 'text-[#D97706]' : 'text-[#151c27]';

  return (
    <div className="flex items-start gap-3 relative z-10">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${circle}`}>
        <span className="material-symbols-outlined text-[12px]">{icon}</span>
      </div>
      <div className="flex flex-col">
        <span className={`font-semibold ${titleColor}`}>{label}</span>
        <span className="text-[11px] text-[#72777f]">{detail}</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Badge class — typed on LoanApplication['status']
// ---------------------------------------------------------------------------
const statusBadge = (status: LoanApplication['status']): string => {
  switch (status) {
    case 'APPROVED':
      return 'bg-[#d4e3ff] text-[#004786]';
    case 'PENDING':
      return 'bg-[#FFFBEB] text-[#D97706]';
    case 'DISBURSED':
    case 'ACTIVE':
    case 'COMPLETED':
      return 'bg-[#F0FDF4] text-[#16A34A]';
    case 'REJECTED':
    case 'CANCELLED':
      return 'bg-[#ffdad6] text-[#ba1a1a]';
    default:
      return 'bg-[#e2e8f8] text-[#72777f]';
  }
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export const LoanApprovalsView: React.FC = () => {
  const { loans, approveLoan, rejectLoan, disburseLoan, showToast } = useBanking();

  const [tabFilter, setTabFilter] = useState<Tab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [busy, setBusy] = useState(false);

  // ---- Filters ----
  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      if (tabFilter !== 'all' && l.status.toLowerCase() !== tabFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          l.id.toLowerCase().includes(q) ||
          l.customerName.toLowerCase().includes(q) ||
          l.customerEmail.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [loans, tabFilter, searchQuery]);

  // ---- Real buckets — DISBURSED + ACTIVE + COMPLETED counted together ----
  const pendingLoans = loans.filter((l) => l.status === 'PENDING');
  const approvedLoans = loans.filter((l) => l.status === 'APPROVED');
  const disbursedLoans = loans.filter(
    (l) => l.status === 'DISBURSED' || l.status === 'ACTIVE' || l.status === 'COMPLETED'
  );

  const pendingAmount = pendingLoans.reduce((s, l) => s + l.principalAmount, 0);
  const approvedAmount = approvedLoans.reduce((s, l) => s + l.principalAmount, 0);
  const disbursedAmount = disbursedLoans.reduce((s, l) => s + l.principalAmount, 0);
  const totalAmount = loans.reduce((s, l) => s + l.principalAmount, 0);

  const pctOf = (part: number) =>
    totalAmount > 0 ? Math.min(100, (part / totalAmount) * 100) : 0;

  // ---- Handlers ----
  const openReview = (loan: LoanApplication) => {
    setSelectedLoan(loan);
    setApprovalNote(loan.approvalNote || '');
    setIsDrawerOpen(true);
  };
  const closeReview = () => setIsDrawerOpen(false);

  const handleApproveClick = (loan: LoanApplication) => {
    setSelectedLoan(loan);
    setIsConfirmModalOpen(true);
  };

  const executeApproval = async () => {
    if (!selectedLoan) return;
    setBusy(true);
    try {
      await approveLoan(selectedLoan.id);
      setIsConfirmModalOpen(false);
      setIsDrawerOpen(false);
      setSelectedLoan(null);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Approval failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const executeReject = async () => {
    if (!selectedLoan) return;
    setBusy(true);
    try {
      await rejectLoan(selectedLoan.id);
      setIsDrawerOpen(false);
      setSelectedLoan(null);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Rejection failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const executeDisburse = async (loanId: string) => {
    setBusy(true);
    try {
      await disburseLoan(loanId);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Disbursement failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportPipelineCsv = () => {
    if (filteredLoans.length === 0) {
      showToast('No loans to export.', 'info');
      return;
    }
    const header =
      'Loan ID,Customer,Email,Amount,Rate,Tenure,EMI,Status,Applied\n';
    const rows = filteredLoans
      .map(
        (l) =>
          `${l.id},${l.customerName},${l.customerEmail},${l.principalAmount},${l.interestRate},${l.tenureMonths},${l.monthlyEmi},${l.status},${l.appliedDate}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan-pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredLoans.length} facilities.`, 'success');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-[#72777f]">
            <span>Manager Portal</span>
            <span className="material-symbols-outlined text-[14px]">
              chevron_right
            </span>
            <span className="text-[#002743] font-semibold">Loan Approvals</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-3xl text-[#002743] font-bold tracking-tight">
              Loan Approvals
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#e2e8f8] text-[#002743] font-semibold text-xs">
              {loans.length} Total Facilities
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#42474e] max-w-2xl">
            Underwriting queue and credit disbursement governance for retail and
            corporate facilities.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={exportPipelineCsv}
            disabled={filteredLoans.length === 0}
            className="h-10 px-4 rounded-lg bg-white shadow-sm hover:bg-[#e7eefe] text-[#002743] font-semibold text-xs flex items-center gap-1.5 border border-[#c2c7cf]/40 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Pipeline</span>
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#72777f]">
              Pending Review
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFFBEB] text-[#D97706]">
              {pendingLoans.length}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl text-[#151c27] font-bold tracking-tight">
              ₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-[#72777f] mt-0.5">
              Awaiting manager memorandum
            </span>
          </div>
          <div className="w-full bg-[#f0f3ff] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#D97706] h-full rounded-full"
              style={{ width: `${pctOf(pendingAmount)}%` }}
            ></div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#72777f]">
              Approved
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#d4e3ff] text-[#004786]">
              {approvedLoans.length}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl text-[#151c27] font-bold tracking-tight">
              ₹{approvedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-[#72777f] mt-0.5">
              Awaiting disbursement release
            </span>
          </div>
          <div className="w-full bg-[#f0f3ff] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#005cab] h-full rounded-full"
              style={{ width: `${pctOf(approvedAmount)}%` }}
            ></div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#72777f]">
              Disbursed
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F0FDF4] text-[#16A34A]">
              {disbursedLoans.length}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl text-[#151c27] font-bold tracking-tight">
              ₹{disbursedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-[#72777f] mt-0.5">
              Servicing in active ledger
            </span>
          </div>
          <div className="w-full bg-[#f0f3ff] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#16A34A] h-full rounded-full"
              style={{ width: `${pctOf(disbursedAmount)}%` }}
            ></div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#002743] text-white shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#cfe5ff]">
              Total Portfolio
            </span>
            <span className="material-symbols-outlined text-[20px] text-[#a2caf7]">
              account_balance_wallet
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl text-white font-bold tracking-tight">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-[#cfe5ff] mt-0.5">
              {loans.length} facilities underwritten
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#7ffc97] text-[11px] font-medium">
            <span className="material-symbols-outlined text-[16px]">
              verified_user
            </span>
            <span>Backend synchronised</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-sm border border-[#c2c7cf]/30 flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-[#e2e8f8]">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#f0f3ff]">
            <button
              type="button"
              onClick={() => setTabFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tabFilter === 'all'
                  ? 'bg-white text-[#002743] shadow-sm'
                  : 'text-[#72777f] hover:text-[#151c27]'
              }`}
            >
              All ({loans.length})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('pending')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tabFilter === 'pending'
                  ? 'bg-white text-[#002743] shadow-sm'
                  : 'text-[#72777f] hover:text-[#151c27]'
              }`}
            >
              Pending ({pendingLoans.length})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('approved')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tabFilter === 'approved'
                  ? 'bg-white text-[#002743] shadow-sm'
                  : 'text-[#72777f] hover:text-[#151c27]'
              }`}
            >
              Approved ({approvedLoans.length})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('disbursed')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tabFilter === 'disbursed'
                  ? 'bg-white text-[#002743] shadow-sm'
                  : 'text-[#72777f] hover:text-[#151c27]'
              }`}
            >
              Disbursed ({disbursedLoans.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <span className="material-symbols-outlined absolute left-3 top-3 text-[18px] text-[#72777f]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Loan ID, Name…"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#f0f3ff] text-[#151c27] text-xs focus:outline-none focus:bg-white border border-[#c2c7cf]/30"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTabFilter('all');
              }}
              className="h-10 px-3 rounded-lg text-[#72777f] hover:text-[#002743] hover:bg-[#e2e8f8] text-xs font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[950px] border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#72777f] text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-6">Loan ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Rate</th>
                <th className="py-3 px-4 text-center">Tenure</th>
                <th className="py-3 px-4 text-right">Monthly EMI</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Applied</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#f0f3ff]">
              {filteredLoans.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#72777f]">
                    {loans.length === 0
                      ? 'No loan applications yet.'
                      : 'No loans match the current filter.'}
                  </td>
                </tr>
              )}
              {filteredLoans.map((loan, idx) => (
                <tr
                  key={loan.id}
                  className={`${
                    idx % 2 === 1 ? 'bg-[#f0f3ff]/30' : 'bg-white'
                  } hover:bg-[#e2e8f8]/50 transition-colors`}
                >
                  <td className="py-4 px-6 font-data-mono font-bold text-[#002743] whitespace-nowrap">
                    {loan.id}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-[#151c27]">
                        {loan.customerName}
                      </span>
                      <span className="text-[11px] text-[#72777f]">
                        {loan.customerEmail}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-[#151c27] whitespace-nowrap">
                    ₹
                    {loan.principalAmount.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-4 px-4 text-center text-[#42474e] whitespace-nowrap font-medium">
                    {loan.interestRate.toFixed(2)}% p.a.
                  </td>
                  <td className="py-4 px-4 text-center text-[#42474e] whitespace-nowrap">
                    {loan.tenureMonths} Months
                  </td>
                  <td className="py-4 px-4 text-right font-data-mono text-[#151c27] whitespace-nowrap">
                    ₹
                    {loan.monthlyEmi.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold ${statusBadge(
                        loan.status
                      )}`}
                    >
                      {loan.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-[#72777f] whitespace-nowrap">
                    {loan.appliedDate}
                  </td>
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      {loan.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleApproveClick(loan)}
                          disabled={busy}
                          className="h-8 px-3 rounded-lg bg-[#0a3d62] text-white hover:bg-[#002743] font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {loan.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => executeDisburse(loan.id)}
                          disabled={busy}
                          className="h-8 px-3 rounded-lg bg-[#005cab] text-white hover:bg-[#004786] font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
                        >
                          Disburse
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openReview(loan)}
                        className="h-8 px-2.5 rounded-lg text-[#005cab] hover:bg-[#e7eefe] font-semibold text-xs transition-colors"
                      >
                        {loan.status === 'DISBURSED' ||
                        loan.status === 'ACTIVE' ||
                        loan.status === 'COMPLETED'
                          ? 'View'
                          : 'Review'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-[#f0f3ff] flex items-center justify-between text-[#72777f] text-xs border-t border-[#e2e8f8]">
          <span>
            Showing <strong className="text-[#151c27]">{filteredLoans.length}</strong>{' '}
            of <strong className="text-[#151c27]">{loans.length}</strong> facilities
          </span>
          <span className="font-bold text-[#002743]">Page 1 of 1</span>
        </div>
      </div>

      {/* Info strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white shadow-sm border border-[#c2c7cf]/30 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#002743]">
            <span className="material-symbols-outlined text-[20px]">
              format_image_left
            </span>
            <span className="font-bold text-sm">Risk Disclosures</span>
          </div>
          <p className="text-xs text-[#42474e] leading-relaxed">
            Final underwriting decisions are recorded on the backend with the
            signed authorisation trail.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white shadow-sm border border-[#c2c7cf]/30 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#002743]">
            <span className="material-symbols-outlined text-[20px]">schedule</span>
            <span className="font-bold text-sm">Turnaround SLA</span>
          </div>
          <p className="text-xs text-[#42474e] leading-relaxed">
            Approvals and disbursements are posted synchronously to the ledger as
            soon as they are executed.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white shadow-sm border border-[#c2c7cf]/30 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#002743]">
            <span className="material-symbols-outlined text-[20px]">gavel</span>
            <span className="font-bold text-sm">Manager Authority</span>
          </div>
          <p className="text-xs text-[#42474e] leading-relaxed">
            Actions on this screen are recorded against your authenticated manager
            session on the server.
          </p>
        </div>
      </div>

      {/* DRAWER */}
      {isDrawerOpen && selectedLoan && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs"
          onClick={closeReview}
        >
          <div
            className="w-full max-w-[460px] h-full bg-white shadow-2xl flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-[#f0f3ff] border-b border-[#e2e8f8] flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[#002743]">
                    Review Application
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white text-[#002743] font-data-mono text-xs font-bold border border-[#c2c7cf]/40">
                    {selectedLoan.id}
                  </span>
                </div>
                <span className="text-[11px] text-[#72777f]">
                  Submitted on {selectedLoan.appliedTimestamp || '—'}
                </span>
              </div>
              <button
                type="button"
                onClick={closeReview}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#72777f] hover:bg-[#e2e8f8]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto">
              {/* Applicant */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#72777f]">
                  Applicant
                </span>
                <div className="p-4 rounded-xl bg-[#f0f3ff] flex flex-col gap-2.5 border border-[#c2c7cf]/30">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#151c27]">
                      {selectedLoan.customerName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${statusBadge(
                        selectedLoan.status
                      )}`}
                    >
                      {selectedLoan.status}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-[#42474e]">
                    <div className="flex justify-between">
                      <span>Customer ID</span>
                      <span className="font-data-mono font-semibold text-[#151c27]">
                        {selectedLoan.customerId || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email</span>
                      <span className="text-[#151c27]">
                        {selectedLoan.customerEmail}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#72777f]">
                  Facility Terms
                </span>
                <div className="p-4 rounded-xl bg-[#f0f3ff] grid grid-cols-2 gap-4 border border-[#c2c7cf]/30 text-xs">
                  <div>
                    <span className="text-[#72777f]">Requested</span>
                    <p className="text-base font-bold text-[#002743]">
                      ₹
                      {selectedLoan.principalAmount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#72777f]">Rate</span>
                    <p className="text-base font-bold text-[#151c27]">
                      {selectedLoan.interestRate.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[#72777f]">Tenure</span>
                    <p className="text-sm font-semibold text-[#151c27]">
                      {selectedLoan.tenureMonths} Months
                    </p>
                  </div>
                  <div>
                    <span className="text-[#72777f]">Monthly EMI</span>
                    <p className="text-sm font-bold text-[#151c27] font-data-mono">
                      ₹
                      {selectedLoan.monthlyEmi.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stepper */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#72777f]">
                  Workflow
                </span>
                <div className="flex flex-col gap-4 pl-2 relative text-xs">
                  <div className="absolute left-4 top-2 bottom-3 w-0.5 bg-[#e2e8f8]"></div>

                  <Step
                    done
                    label="Application Submitted"
                    detail={selectedLoan.appliedDate || '—'}
                  />
                  <Step
                    done={selectedLoan.status !== 'PENDING'}
                    active={selectedLoan.status === 'PENDING'}
                    label="Underwriting Review"
                    detail={
                      selectedLoan.status === 'PENDING'
                        ? 'In progress with the manager'
                        : 'Review completed'
                    }
                  />
                  <Step
                    done={
                      selectedLoan.status === 'APPROVED' ||
                      selectedLoan.status === 'DISBURSED' ||
                      selectedLoan.status === 'ACTIVE' ||
                      selectedLoan.status === 'COMPLETED'
                    }
                    label="Sanction & Approval"
                    detail={
                      selectedLoan.status === 'APPROVED' ||
                      selectedLoan.status === 'DISBURSED' ||
                      selectedLoan.status === 'ACTIVE' ||
                      selectedLoan.status === 'COMPLETED'
                        ? 'Signed off by Manager'
                        : 'Awaiting sign-off'
                    }
                  />
                  <Step
                    done={
                      selectedLoan.status === 'DISBURSED' ||
                      selectedLoan.status === 'ACTIVE' ||
                      selectedLoan.status === 'COMPLETED'
                    }
                    label="Disbursement"
                    detail={
                      selectedLoan.status === 'DISBURSED' ||
                      selectedLoan.status === 'ACTIVE' ||
                      selectedLoan.status === 'COMPLETED'
                        ? 'Treasury ledger released'
                        : 'Pending'
                    }
                  />
                </div>
              </div>

              {/* Note */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold text-[#151c27]"
                  htmlFor="approvalNoteText"
                >
                  Approval note (local draft)
                </label>
                <textarea
                  id="approvalNoteText"
                  rows={3}
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="Internal memorandum…"
                  className="w-full p-3 rounded-lg bg-[#f0f3ff] text-xs text-[#151c27] focus:outline-none focus:bg-white border border-[#c2c7cf]/40"
                />
              </div>
            </div>

            <div className="p-6 bg-[#f0f3ff] border-t border-[#e2e8f8] flex items-center gap-3">
              {selectedLoan.status === 'PENDING' ? (
                <>
                  <button
                    type="button"
                    onClick={executeReject}
                    disabled={busy}
                    className="flex-1 h-11 px-4 rounded-lg text-[#ba1a1a] hover:bg-[#ffdad6] font-semibold text-xs transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setIsConfirmModalOpen(true);
                    }}
                    disabled={busy}
                    className="flex-1 h-11 px-4 rounded-lg bg-[#0a3d62] text-white hover:bg-[#002743] font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
                  >
                    Approve {selectedLoan.id}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeReview}
                  className="w-full h-11 px-4 rounded-lg bg-[#0a3d62] text-white text-xs font-semibold"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {isConfirmModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl flex flex-col overflow-hidden border border-[#c2c7cf]/40">
            <div className="p-6 bg-[#f0f3ff] flex items-center gap-3 border-b border-[#e2e8f8]">
              <div className="w-10 h-10 rounded-lg bg-[#d4e3ff] text-[#004786] flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">
                  verified
                </span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-base font-bold text-[#002743]">
                  Confirm Loan Approval
                </h2>
                <span className="text-xs text-[#72777f]">
                  Irrevocable credit decision
                </span>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs">
              <p className="text-[#151c27] leading-relaxed">
                Approve{' '}
                <strong className="text-[#002743] font-data-mono">
                  {selectedLoan.id}
                </strong>{' '}
                for{' '}
                <strong className="text-[#002743]">
                  ₹
                  {selectedLoan.principalAmount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </strong>
                ? This will update the credit registry and enable disbursement.
              </p>

              <div className="p-3 rounded-lg bg-[#f0f3ff] flex items-center gap-2 text-[#42474e] border border-[#c2c7cf]/30">
                <span className="material-symbols-outlined text-[18px] text-[#002743]">
                  info
                </span>
                <span className="truncate font-medium">
                  {selectedLoan.id} · {selectedLoan.customerName} · ₹
                  {selectedLoan.principalAmount.toLocaleString('en-IN')} @{' '}
                  {selectedLoan.interestRate}%
                </span>
              </div>
            </div>

            <div className="p-4 bg-[#f0f3ff] border-t border-[#e2e8f8] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={busy}
                className="h-10 px-4 rounded-lg text-[#42474e] hover:bg-[#e2e8f8] text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeApproval}
                disabled={busy}
                className="h-10 px-5 rounded-lg bg-[#002743] text-white hover:bg-[#0a3d62] text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {busy ? 'Approving…' : 'Confirm & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};