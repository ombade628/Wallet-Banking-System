import React, { useEffect, useId, useState } from 'react';
import { useBanking } from '../../context/BankingContext';
import { client } from '../../api/client';
import { LoanApplication } from '../../types';

// ---------------------------------------------------------------------------
// Badge helpers — typed on LoanApplication['status'] for exhaustive matching
// ---------------------------------------------------------------------------
const loanStatusClass = (status: LoanApplication['status']): string => {
    switch (status) {
        case 'APPROVED':
            return 'bg-[#d4e3ff] text-[#004786]';
        case 'PENDING':
            return 'bg-[#FEF3C7] text-[#B45309]';
        case 'DISBURSED':
        case 'ACTIVE':
        case 'COMPLETED':
            return 'bg-[#DCFCE7] text-[#15803D]';
        case 'REJECTED':
        case 'CANCELLED':
            return 'bg-[#ffdad6] text-[#ba1a1a]';
        default:
            return 'bg-[#e2e8f8] text-[#72777f]';
    }
};

const emiStatusClass = (status: string): string => {
    switch (status) {
        case 'PAID':
            return 'bg-[#DCFCE7] text-[#15803D]';
        case 'OVERDUE':
            return 'bg-[#ffdad6] text-[#ba1a1a]';
        case 'DUE':
            return 'bg-[#FEF3C7] text-[#B45309]';
        default:
            return 'bg-[#f0f3ff] text-[#42474e]';
    }
};

export const LoansView: React.FC = () => {
    const { loans, applyForLoan, previewEmi, loanSchedule, showToast } = useBanking();

    const [amount, setAmount] = useState<number>(250000);
    const [tenure, setTenure] = useState<number>(24);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedLoanId, setSubmittedLoanId] = useState<string | null>(null);
    const formSectionId = useId();

    const [emiPreview, setEmiPreview] = useState<{
        monthlyEmi: number;
        totalPayable: number;
    } | null>(null);
    const annualRate = 10.5;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const p = await previewEmi(amount || 0, annualRate, tenure || 1);
                if (!cancelled) {
                    setEmiPreview({
                        monthlyEmi: Number(p.monthlyEmi),
                        totalPayable: Number(p.totalPayable),
                    });
                }
            } catch {
                if (!cancelled) setEmiPreview(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [amount, tenure, previewEmi]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount < 10000) {
            showToast('Minimum loan amount is ₹10,000.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const newLoan = await applyForLoan({
                principalAmount: amount,
                tenureMonths: tenure,
                interestRate: annualRate,
            });
            setSubmittedLoanId(newLoan.id);
            showToast(`Application ${newLoan.id} lodged with risk manager.`, 'success');
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Loan application failed', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setAmount(250000);
        setTenure(24);
        setSubmittedLoanId(null);
    };

    // ---- Derived buckets — every status is now matched correctly ----
    const approvedLoans = loans.filter((l) => l.status === 'APPROVED');
    const pendingLoans = loans.filter((l) => l.status === 'PENDING');
    const disbursedLoans = loans.filter(
        (l) => l.status === 'DISBURSED' || l.status === 'ACTIVE' || l.status === 'COMPLETED'
    );
    const cancelledLoans = loans.filter((l) => l.status === 'CANCELLED');
    const rejectedLoans = loans.filter((l) => l.status === 'REJECTED');
    const totalApprovedPrincipal = approvedLoans.reduce(
        (s, l) => s + l.principalAmount,
        0
    );

    const nextEmiLoan = disbursedLoans[0];
    const nextEmi = nextEmiLoan?.monthlyEmi || 0;

    const [openScheduleLoanId, setOpenScheduleLoanId] = useState<string | null>(null);
    const [scheduleData, setScheduleData] = useState<any[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    const handleViewSchedule = async (loanId: string) => {
        if (openScheduleLoanId === loanId) {
            setOpenScheduleLoanId(null);
            setScheduleData([]);
            return;
        }
        setScheduleLoading(true);
        try {
            const rows = await loanSchedule(loanId);
            setScheduleData(rows);
            setOpenScheduleLoanId(loanId);
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Unable to load schedule', 'error');
        } finally {
            setScheduleLoading(false);
        }
    };

    const handleExportSchedule = () => {
        if (!scheduleData.length) {
            showToast('Open a loan schedule first to export it.', 'info');
            return;
        }
        const header = 'Installment,Due Date,EMI,Principal,Interest,Status,Paid Date\n';
        const rows = scheduleData
            .map(
                (r) =>
                    `${r.installmentNumber},${r.dueDate},${r.emiAmount},${r.principalAmount},${r.interestAmount},${r.status},${r.paidDate || ''}`
            )
            .join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `loan-${openScheduleLoanId}-schedule.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Schedule CSV exported.', 'success');
    };

    const handlePayEmi = async (loanId: string, installmentNumber: number) => {
        try {
            const res = await client.post(
                `/api/loans/${loanId}/emi/${installmentNumber}/pay`
            );
            showToast(
                `EMI ${installmentNumber} paid. New balance ₹${Number(res.data.newBalance).toLocaleString('en-IN')}`,
                'success'
            );
            const rows = await loanSchedule(loanId);
            setScheduleData(rows);
        } catch (e: any) {
            showToast(e.response?.data?.message || 'EMI payment failed', 'error');
        }
    };

    return (
        <div className="max-w-[1440px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[#72777f] text-xs">
                        <span>PORTAL</span>
                        <span>/</span>
                        <span className="text-[#002743] font-semibold uppercase tracking-wider">
                            LOANS
                        </span>
                    </div>
                    <h1 className="text-3xl text-[#002743] font-bold tracking-tight">My Loans</h1>
                    <p className="text-xs sm:text-sm text-[#42474e] max-w-2xl">
                        Overview of your personal and business financing, EMI schedules, and
                        institutional credit facilities.
                    </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                    <button
                        type="button"
                        onClick={() => {
                            const el = document.getElementById(formSectionId);
                            el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center justify-center gap-2 bg-[#0a3d62] text-white text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-[#002743] transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        <span>Apply for a loan</span>
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wider text-[#72777f] font-bold">
                                Active Loans
                            </span>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-3xl text-[#002743] font-bold tracking-tight">
                                    {disbursedLoans.length} Active
                                </span>
                                <span className="text-xs text-[#42474e]">
                                    / {loans.length} Facilities
                                </span>
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-lg bg-[#e2e8f8] flex items-center justify-center text-[#0a3d62]">
                            <span className="material-symbols-outlined text-[24px]">
                                account_balance_wallet
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 pt-2 flex items-center gap-2 text-[#42474e] text-xs border-t border-[#f0f3ff]">
                        <span className="w-2 h-2 rounded-full bg-[#005cab]"></span>
                        <span>
                            {approvedLoans.length} approved · {pendingLoans.length} in review
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wider text-[#72777f] font-bold">
                                Total Approved Principal
                            </span>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-3xl text-[#002743] font-bold tracking-tight">
                                    ₹
                                    {totalApprovedPrincipal.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-lg bg-[#e2e8f8] flex items-center justify-center text-[#0a3d62]">
                            <span className="material-symbols-outlined text-[24px]">
                                currency_rupee
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 pt-2 flex items-center justify-between text-[#42474e] text-xs border-t border-[#f0f3ff]">
                        <span>Approved &amp; disbursed facilities</span>
                        <span className="font-semibold text-[#005cab]">
                            {approvedLoans.length + disbursedLoans.length} loans
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wider text-[#72777f] font-bold">
                                Next EMI
                            </span>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-3xl text-[#002743] font-bold tracking-tight">
                                    {nextEmi > 0
                                        ? `₹${nextEmi.toLocaleString('en-IN', {
                                            minimumFractionDigits: 2,
                                        })}`
                                        : '—'}
                                </span>
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-lg bg-[#e2e8f8] flex items-center justify-center text-[#0a3d62]">
                            <span className="material-symbols-outlined text-[24px]">
                                event_repeat
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 pt-2 flex items-center gap-1.5 text-xs text-[#42474e] border-t border-[#f0f3ff]">
                        {nextEmiLoan ? (
                            <>
                                <span className="material-symbols-outlined text-[#005cab] text-[16px]">
                                    schedule
                                </span>
                                <span className="text-[#151c27] font-semibold">
                                    Loan {nextEmiLoan.id}
                                </span>
                            </>
                        ) : (
                            <span className="text-[#72777f]">No active EMI facility</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Loans table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#c2c7cf]/30 flex flex-col overflow-hidden">
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0f3ff]">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-[#002743]">My loan applications</h2>
                        <span className="bg-[#e2e8f8] text-[#42474e] text-xs px-2.5 py-0.5 rounded-full font-semibold">
                            {loans.length} records
                        </span>
                        {(cancelledLoans.length > 0 || rejectedLoans.length > 0) && (
                            <span className="text-[11px] text-[#72777f]">
                                {rejectedLoans.length} rejected · {cancelledLoans.length} cancelled
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleExportSchedule}
                        disabled={!scheduleData.length}
                        className="inline-flex items-center gap-1.5 bg-[#e2e8f8] hover:bg-[#dce2f3] text-[#151c27] text-xs font-semibold px-4 py-2 rounded-lg transition-colors self-start sm:self-auto disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[18px] text-[#72777f]">
                            download
                        </span>
                        <span>Export schedule</span>
                    </button>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-[#f0f3ff] text-[#42474e] text-[11px] uppercase tracking-wider font-semibold">
                                <th className="py-3 px-6">Loan ID</th>
                                <th className="py-3 px-6 text-right">Principal Amount</th>
                                <th className="py-3 px-6 text-center">Interest Rate</th>
                                <th className="py-3 px-6 text-center">Tenure</th>
                                <th className="py-3 px-6 text-right">Monthly EMI</th>
                                <th className="py-3 px-6 text-center">Status</th>
                                <th className="py-3 px-6">Applied Date</th>
                                <th className="py-3 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-[#f0f3ff]">
                            {loans.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-10 text-center text-[#72777f]">
                                        No loan applications yet. Submit the form below to apply.
                                    </td>
                                </tr>
                            )}
                            {loans.map((loan, idx) => {
                                const isDisbursed =
                                    loan.status === 'DISBURSED' ||
                                    loan.status === 'ACTIVE' ||
                                    loan.status === 'COMPLETED';
                                const isOpen = openScheduleLoanId === loan.id;
                                return (
                                    <React.Fragment key={loan.id}>
                                        <tr
                                            className={`${idx % 2 === 1 ? 'bg-[#f0f3ff]/30' : 'bg-white'
                                                } hover:bg-[#e2e8f8]/50 transition-colors`}
                                        >
                                            <td className="py-4 px-6 font-data-mono font-bold text-[#002743]">
                                                {loan.id}
                                            </td>
                                            <td className="py-4 px-6 font-data-mono text-right font-semibold text-[#151c27]">
                                                ₹
                                                {loan.principalAmount.toLocaleString('en-IN', {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td className="py-4 px-6 text-center text-[#42474e]">
                                                {loan.interestRate.toFixed(2)}% p.a.
                                            </td>
                                            <td className="py-4 px-6 text-center text-[#42474e]">
                                                {loan.tenureMonths} Months
                                            </td>
                                            <td className="py-4 px-6 font-data-mono text-right font-bold text-[#002743]">
                                                ₹
                                                {loan.monthlyEmi.toLocaleString('en-IN', {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${loanStatusClass(
                                                        loan.status
                                                    )}`}
                                                >
                                                    {loan.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-[#42474e]">
                                                {loan.appliedDate}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewSchedule(loan.id)}
                                                    disabled={scheduleLoading}
                                                    className="inline-flex items-center gap-1 text-xs text-[#005cab] hover:text-[#002743] font-semibold disabled:opacity-50"
                                                >
                                                    <span>{isOpen ? 'Hide' : 'Schedule'}</span>
                                                    <span className="material-symbols-outlined text-[16px]">
                                                        {isOpen ? 'expand_less' : 'chevron_right'}
                                                    </span>
                                                </button>
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr>
                                                <td colSpan={8} className="bg-[#f0f3ff] p-4">
                                                    <div className="bg-white rounded-lg border border-[#c2c7cf]/40 overflow-hidden">
                                                        <div className="p-3 bg-[#f0f3ff] border-b border-[#e2e8f8] text-[11px] uppercase font-bold tracking-wider text-[#72777f]">
                                                            EMI Schedule · Loan {loan.id}
                                                        </div>
                                                        {scheduleData.length === 0 ? (
                                                            <div className="p-4 text-center text-xs text-[#72777f]">
                                                                No schedule generated yet (only disbursed loans
                                                                have schedules).
                                                            </div>
                                                        ) : (
                                                            <table className="w-full text-left text-xs">
                                                                <thead>
                                                                    <tr className="bg-[#f0f3ff] text-[#72777f] text-[10px] uppercase tracking-wider font-semibold">
                                                                        <th className="py-2 px-4">#</th>
                                                                        <th className="py-2 px-4">Due</th>
                                                                        <th className="py-2 px-4 text-right">EMI</th>
                                                                        <th className="py-2 px-4 text-right">Principal</th>
                                                                        <th className="py-2 px-4 text-right">Interest</th>
                                                                        <th className="py-2 px-4 text-center">Status</th>
                                                                        <th className="py-2 px-4 text-right">Action</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {scheduleData.map((row) => (
                                                                        <tr
                                                                            key={row.installmentNumber}
                                                                            className="border-t border-[#f0f3ff]"
                                                                        >
                                                                            <td className="py-2 px-4 font-semibold">
                                                                                {row.installmentNumber}
                                                                            </td>
                                                                            <td className="py-2 px-4 font-data-mono">
                                                                                {row.dueDate}
                                                                            </td>
                                                                            <td className="py-2 px-4 text-right font-data-mono">
                                                                                ₹
                                                                                {Number(row.emiAmount).toLocaleString('en-IN')}
                                                                            </td>
                                                                            <td className="py-2 px-4 text-right font-data-mono">
                                                                                ₹
                                                                                {Number(row.principalAmount).toLocaleString(
                                                                                    'en-IN'
                                                                                )}
                                                                            </td>
                                                                            <td className="py-2 px-4 text-right font-data-mono">
                                                                                ₹
                                                                                {Number(row.interestAmount).toLocaleString(
                                                                                    'en-IN'
                                                                                )}
                                                                            </td>
                                                                            <td className="py-2 px-4 text-center">
                                                                                <span
                                                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${emiStatusClass(
                                                                                        row.status
                                                                                    )}`}
                                                                                >
                                                                                    {row.status}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-2 px-4 text-right">
                                                                                {isDisbursed && row.status !== 'PAID' ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            handlePayEmi(
                                                                                                loan.id,
                                                                                                row.installmentNumber
                                                                                            )
                                                                                        }
                                                                                        className="px-2.5 py-1 rounded bg-[#0a3d62] text-white text-[10px] font-bold hover:bg-[#002743]"
                                                                                    >
                                                                                        Pay
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className="text-[#72777f]">—</span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-3 bg-[#f0f3ff] flex items-center justify-between text-[#42474e] text-xs border-t border-[#e2e8f8]">
                    <span>
                        Showing {loans.length} of {loans.length} corporate loan applications
                    </span>
                    <span className="px-2 font-bold text-[#002743]">Page 1 of 1</span>
                </div>
            </div>

            {/* Apply form */}
            <section
                id={formSectionId}
                className="bg-white rounded-xl shadow-sm border border-[#c2c7cf]/30 overflow-hidden flex flex-col"
            >
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f0f3ff]/50 border-b border-[#e2e8f8]">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2.5">
                            <h3 className="text-base font-bold text-[#002743]">
                                Apply for a new loan
                            </h3>
                            <span className="bg-[#7ffc97] text-[#005320] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Backend EMI Preview
                            </span>
                        </div>
                        <p className="text-xs text-[#42474e]">
                            EMI is calculated server-side using the diminishing-balance method.
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#72777f] text-xs">
                        <span className="material-symbols-outlined text-[#00451a] text-[18px]">
                            verified_user
                        </span>
                        <span>End-to-End Encrypted</span>
                    </div>
                </div>

                {submittedLoanId && (
                    <div className="p-4 bg-[#F0FDF4] text-[#002c0e] flex items-center justify-between border-b border-[#16A34A]/30">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#16A34A] text-[28px]">
                                check_circle
                            </span>
                            <div className="flex flex-col text-xs">
                                <span className="font-bold text-sm text-[#002c0e]">
                                    Application Received
                                </span>
                                <span className="text-[#42474e]">
                                    Your reference is{' '}
                                    <strong className="font-data-mono text-[#002743]">
                                        {submittedLoanId}
                                    </strong>
                                    .
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSubmittedLoanId(null)}
                            className="text-[#72777f] hover:text-[#151c27]"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-1.5">
                            <label
                                className="text-xs font-semibold text-[#002743]"
                                htmlFor="loanAmount"
                            >
                                Loan amount (₹) <span className="text-[#ba1a1a]">*</span>
                            </label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3.5 text-[#42474e] font-bold font-data-mono">
                                    ₹
                                </span>
                                <input
                                    id="loanAmount"
                                    type="number"
                                    min="10000"
                                    step="5000"
                                    value={amount}
                                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                    required
                                    placeholder="e.g. 2,50,000"
                                    className="w-full h-12 pl-8 pr-4 bg-[#f0f3ff] text-[#151c27] font-data-mono text-sm font-bold rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#005cab] border border-[#c2c7cf]/40"
                                />
                            </div>
                            <span className="text-[11px] text-[#42474e]">
                                Minimum amount ₹10,000
                            </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label
                                className="text-xs font-semibold text-[#002743]"
                                htmlFor="loanRate"
                            >
                                Interest rate (% p.a.)
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    id="loanRate"
                                    type="text"
                                    readOnly
                                    value={annualRate.toFixed(2)}
                                    className="w-full h-12 px-4 bg-[#e2e8f8]/60 text-[#42474e] font-data-mono text-sm font-bold rounded-lg cursor-not-allowed select-none border border-[#c2c7cf]/30"
                                />
                                <span className="absolute right-3.5 text-[#72777f] text-[10px] font-bold uppercase">
                                    Fixed Rate
                                </span>
                            </div>
                            <span className="text-[11px] text-[#42474e]">
                                Standard prime lending rate applies
                            </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label
                                className="text-xs font-semibold text-[#002743]"
                                htmlFor="loanTenure"
                            >
                                Tenure (months) <span className="text-[#ba1a1a]">*</span>
                            </label>
                            <div className="relative flex items-center">
                                <select
                                    id="loanTenure"
                                    value={tenure}
                                    onChange={(e) => setTenure(parseInt(e.target.value, 10))}
                                    required
                                    className="w-full h-12 px-4 bg-[#f0f3ff] text-[#151c27] text-xs font-semibold rounded-lg appearance-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#005cab] border border-[#c2c7cf]/40 cursor-pointer"
                                >
                                    <option value={6}>6 Months</option>
                                    <option value={12}>12 Months</option>
                                    <option value={18}>18 Months</option>
                                    <option value={24}>24 Months</option>
                                    <option value={36}>36 Months</option>
                                    <option value={48}>48 Months</option>
                                    <option value={60}>60 Months</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[#72777f] text-[20px]">
                                    expand_more
                                </span>
                            </div>
                            <span className="text-[11px] text-[#42474e]">
                                Flexible repayment terms up to 5 years
                            </span>
                        </div>
                    </div>

                    <div className="bg-[#f0f3ff] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-[#c2c7cf]/40">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#dce2f3] flex items-center justify-center text-[#0a3d62]">
                                <span className="material-symbols-outlined text-[22px]">
                                    calculate
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-[#72777f] uppercase font-bold tracking-wider">
                                    Backend Projection
                                </span>
                                <span className="text-xs text-[#42474e]">
                                    Diminishing balance method
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                            <div className="flex flex-col md:items-end">
                                <span className="text-[11px] text-[#42474e]">Monthly EMI</span>
                                <span className="text-lg text-[#002743] font-bold font-data-mono">
                                    {emiPreview
                                        ? `₹${emiPreview.monthlyEmi.toLocaleString('en-IN', {
                                            minimumFractionDigits: 2,
                                        })}`
                                        : '—'}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-[#dce2f3] hidden sm:block"></div>
                            <div className="flex flex-col md:items-end">
                                <span className="text-[11px] text-[#42474e]">Total Payable</span>
                                <span className="text-base text-[#151c27] font-bold font-data-mono">
                                    {emiPreview
                                        ? `₹${emiPreview.totalPayable.toLocaleString('en-IN', {
                                            minimumFractionDigits: 2,
                                        })}`
                                        : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#e2e8f8]/50 flex items-start gap-3 text-[#42474e] border border-[#c2c7cf]/30">
                        <span className="material-symbols-outlined text-[#005cab] text-[20px] shrink-0 mt-0.5">
                            info
                        </span>
                        <p className="text-xs leading-relaxed">
                            Your application will be reviewed by an authorized JavaBank risk
                            manager. Disbursements are subject to standard KYC and underwriting.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-1.5 text-[#72777f] text-xs">
                            <span className="material-symbols-outlined text-[18px]">lock</span>
                            <span>256-Bit SSL Secured Request</span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold text-[#42474e] hover:bg-[#e2e8f8] transition-colors"
                            >
                                Reset
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0a3d62] text-white text-xs font-bold px-6 py-2.5 rounded-lg hover:bg-[#002743] transition-colors shadow-sm disabled:opacity-60"
                            >
                                {isSubmitting ? (
                                    <svg
                                        className="animate-spin h-4 w-4 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            fill="currentColor"
                                        ></path>
                                    </svg>
                                ) : (
                                    <span className="material-symbols-outlined text-[18px]">
                                        send
                                    </span>
                                )}
                                <span>
                                    {isSubmitting ? 'Processing...' : 'Submit application'}
                                </span>
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#e2e8f8] flex items-center justify-center text-[#002743] shrink-0">
                        <span className="material-symbols-outlined text-[26px]">
                            shield_person
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-[#002743] font-bold">
                            Institutional Grievance &amp; Prepayment Policy
                        </span>
                        <span className="text-xs text-[#42474e]">
                            Zero penalty on pre-closures after 6 active billing cycles.
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => showToast('Terms of Lending documentation opened.', 'info')}
                    className="text-xs text-[#005cab] font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                >
                    <span>Read Terms</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                </button>
            </div>

            <div className="text-center pb-4 text-[11px] text-[#72777f]">
                Regulated by Reserve Bank of India (RBI) under Non-Banking &amp; Corporate Lending Framework.
            </div>
        </div>
    );
};