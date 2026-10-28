package com.bank.banking.service;

import com.bank.banking.model.entity.*;
import com.bank.banking.repository.AccountRepo;
import com.bank.banking.repository.LedgerEntryRepo;
import com.bank.banking.repository.LoanEmiRepo;
import com.bank.banking.repository.LoanRepo;
import com.bank.banking.repository.TransactionRepo;
import com.bank.banking.repository.UserRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class LoanService {

    private final LoanRepo loans;
    private final UserRepo users;
    private final AccountRepo accounts;
    private final TransactionRepo transactions;
    private final LedgerEntryRepo ledger;
    private final LoanEmiRepo emiRepo;
    private final AuditService audit;
 // in LoanRepository

    public LoanService(LoanRepo loans,
                       UserRepo users,
                       AccountRepo accounts,
                       TransactionRepo transactions,
                       LedgerEntryRepo ledger,
                       LoanEmiRepo emiRepo,
                       AuditService audit) {
        this.loans = loans;
        this.users = users;
        this.accounts = accounts;
        this.transactions = transactions;
        this.ledger = ledger;
        this.emiRepo = emiRepo;
        this.audit = audit;
    }
    
    public long countByStatus(LoanStatus status) {
        return loans.countByStatus(status);
    }
    
    

    // ================================================================
    // APPLY
    // ================================================================
    @Transactional
    public Loan apply(UUID customerId, BigDecimal amount, BigDecimal rate, int tenureMonths) {
        User customer = users.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Loan loan = new Loan();
        loan.setCustomer(customer);
        loan.setAmount(amount);
        loan.setInterestRate(rate);
        loan.setTenureMonths(tenureMonths);
        loan.setStatus(LoanStatus.PENDING);
        loan.setAppliedDate(LocalDate.now());
        loan.setOutstandingAmount(amount);
        loan.setEmiAmount(computeEmi(amount, rate, tenureMonths));
        return loans.save(loan);
    }

    // ================================================================
    // REJECT
    // ================================================================
    @Transactional
    public Loan reject(Long loanId) {
        Loan loan = findPending(loanId);
        loan.setStatus(LoanStatus.REJECTED);
        audit.log(null, "REJECT_LOAN", "Loan", loanId.toString(), null);
        return loan;
    }

    // ================================================================
    // APPROVE
    // ================================================================
    @Transactional
    public Loan approve(Long loanId) {
        Loan loan = findPending(loanId);
        loan.setStatus(LoanStatus.APPROVED);
        loan.setApprovedDate(LocalDate.now());
        audit.log(null, "APPROVE_LOAN", "Loan", loanId.toString(), null);
        return loan;
    }

    // ================================================================
    // DISBURSE — credits account, writes ledger, generates EMI schedule
    // ================================================================
    @Transactional
    public Loan disburse(Long loanId) {
        Loan loan = loans.findById(loanId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));
        if (loan.getStatus() != LoanStatus.APPROVED) {
            throw new IllegalStateException("Loan is not APPROVED");
        }

        Account account = accounts.findByOwnerId(loan.getCustomer().getId()).stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Customer has no active account"));

        Account locked = accounts.findByIdForUpdate(account.getId())
                .orElseThrow(() -> new IllegalStateException("Unable to lock account"));

        locked.credit(loan.getAmount());

        Transaction txn = new Transaction(
                "LOAN-DISBURSE-" + loan.getId() + "-" + UUID.randomUUID(),
                null, locked,
                loan.getAmount(), locked.getCurrency());
        transactions.save(txn);
        ledger.save(LedgerEntry.credit(txn, locked, loan.getAmount()));

        loan.setStatus(LoanStatus.DISBURSED);
        loan.setDisbursedDate(LocalDate.now());

        generateSchedule(loan);
        audit.log(null, "DISBURSE_LOAN", "Loan", loanId.toString(),
                "amount=" + loan.getAmount());

        return loan;
    }

    // ================================================================
    // EMI SCHEDULE GENERATION
    // ================================================================
    @Transactional
    public void generateSchedule(Loan loan) {
        if (!emiRepo.findByLoanIdOrderByInstallmentNumber(loan.getId()).isEmpty()) {
            return;
        }

        BigDecimal monthlyRate = loan.getInterestRate()
                .divide(BigDecimal.valueOf(1200), MathContext.DECIMAL64);
        BigDecimal emi = loan.getEmiAmount();
        BigDecimal remaining = loan.getAmount();
        LocalDate due = LocalDate.now().plusMonths(1);

        for (int i = 1; i <= loan.getTenureMonths(); i++) {
            BigDecimal interest = remaining.multiply(monthlyRate)
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal principalPart = emi.subtract(interest);
            remaining = remaining.subtract(principalPart);

            LoanEmi row = new LoanEmi();
            row.setLoan(loan);
            row.setInstallmentNumber(i);
            row.setDueDate(due);
            row.setEmiAmount(emi);
            row.setPrincipalAmount(principalPart);
            row.setInterestAmount(interest);
            row.setStatus(EmiStatus.UPCOMING);
            emiRepo.save(row);

            due = due.plusMonths(1);
        }
    }

    // ================================================================
    // SCHEDULE READ
    // ================================================================
    @Transactional(readOnly = true)
    public List<Map<String, Object>> schedule(Long loanId) {
        return emiRepo.findByLoanIdOrderByInstallmentNumber(loanId).stream()
                .map(e -> Map.<String, Object>of(
                        "installmentNumber", e.getInstallmentNumber(),
                        "dueDate", e.getDueDate() == null ? "" : e.getDueDate().toString(),
                        "emiAmount", e.getEmiAmount(),
                        "principalAmount", e.getPrincipalAmount(),
                        "interestAmount", e.getInterestAmount(),
                        "status", e.getStatus().name(),
                        "paidDate", e.getPaidDate() == null ? "" : e.getPaidDate().toString()))
                .toList();
    }

    // ================================================================
    // PAY ONE EMI
    // ================================================================
    @Transactional
    public Map<String, Object> payEmi(Long loanId, int installmentNumber, UUID callerId) {
        Loan loan = loans.findById(loanId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));

        if (!loan.getCustomer().getId().equals(callerId)) {
            throw new IllegalArgumentException("Loan not found");
        }
        if (loan.getStatus() != LoanStatus.DISBURSED && loan.getStatus() != LoanStatus.ACTIVE) {
            throw new IllegalStateException("Loan is not active");
        }

        LoanEmi row = emiRepo.findByLoanIdOrderByInstallmentNumber(loanId).stream()
                .filter(e -> e.getInstallmentNumber() == installmentNumber)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Installment not found"));

        if (row.getStatus() == EmiStatus.PAID) {
            throw new IllegalStateException("Installment already paid");
        }

        Account acc = accounts.findByOwnerId(callerId).stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No active account"));

        Account locked = accounts.findByIdForUpdate(acc.getId())
                .orElseThrow(() -> new IllegalStateException("Cannot lock account"));
        locked.debit(row.getEmiAmount());

        Transaction txn = new Transaction(
                "EMI-" + UUID.randomUUID(),
                locked, null,
                row.getEmiAmount(), locked.getCurrency());
        transactions.save(txn);
        ledger.save(LedgerEntry.debit(txn, locked, row.getEmiAmount()));

        row.setStatus(EmiStatus.PAID);
        row.setPaidDate(LocalDate.now());

        BigDecimal outstanding = loan.getOutstandingAmount() == null
                ? BigDecimal.ZERO
                : loan.getOutstandingAmount().subtract(row.getPrincipalAmount());
        loan.setOutstandingAmount(outstanding);

        if (outstanding.signum() <= 0) {
            loan.setStatus(LoanStatus.COMPLETED);
        }

        audit.log(callerId, "PAY_EMI", "LoanEmi", String.valueOf(row.getId()),
                "loanId=" + loanId + " installment=" + installmentNumber);

        return Map.of(
                "loanId", loanId,
                "installmentNumber", installmentNumber,
                "amountPaid", row.getEmiAmount(),
                "newBalance", locked.getBalance(),
                "loanOutstanding", outstanding,
                "loanStatus", loan.getStatus().name());
    }

    // ================================================================
    // READS
    // ================================================================
    @Transactional(readOnly = true)
    public List<Loan> forCustomer(UUID customerId) {
        return loans.findByCustomerIdOrderByAppliedDateDesc(customerId);
    }

    @Transactional(readOnly = true)
    public List<Loan> pending() {
        return loans.findByStatus(LoanStatus.PENDING);
    }

    @Transactional(readOnly = true)
    public List<Loan> byStatus(LoanStatus status) {
        return loans.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public Loan getForCaller(Long id, UUID callerId, boolean isStaff) {
        Loan loan = loans.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));
        if (!isStaff && !loan.getCustomer().getId().equals(callerId)) {
            throw new IllegalArgumentException("Loan not found");
        }
        return loan;
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Loan> allPaged(int page, int size) {
        return loans.findAll(
                org.springframework.data.domain.PageRequest.of(
                        page, size,
                        org.springframework.data.domain.Sort.by("appliedDate").descending()));
    }

    // ================================================================
    // CANCEL
    // ================================================================
    @Transactional
    public Loan cancel(Long loanId, UUID callerId) {
        Loan loan = loans.findById(loanId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));
        if (!loan.getCustomer().getId().equals(callerId)) {
            throw new IllegalArgumentException("Loan not found");
        }
        if (loan.getStatus() != LoanStatus.PENDING) {
            throw new IllegalStateException("Only PENDING loans can be cancelled");
        }
        loan.setStatus(LoanStatus.CANCELLED);
        audit.log(callerId, "CANCEL_LOAN", "Loan", loanId.toString(), null);
        return loan;
    }

    // ================================================================
    // STATS
    // ================================================================
    @Transactional(readOnly = true)
    public Map<String, Object> stats() {
        List<Loan> all = loans.findAll();
        long pending   = all.stream().filter(l -> l.getStatus() == LoanStatus.PENDING).count();
        long approved  = all.stream().filter(l -> l.getStatus() == LoanStatus.APPROVED).count();
        long disbursed = all.stream().filter(l -> l.getStatus() == LoanStatus.DISBURSED).count();
        long rejected  = all.stream().filter(l -> l.getStatus() == LoanStatus.REJECTED).count();
        long cancelled = all.stream().filter(l -> l.getStatus() == LoanStatus.CANCELLED).count();
        BigDecimal portfolio = all.stream()
                .filter(l -> l.getStatus() == LoanStatus.DISBURSED
                          || l.getStatus() == LoanStatus.ACTIVE
                          || l.getStatus() == LoanStatus.COMPLETED)
                .map(Loan::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return Map.of(
                "total", all.size(),
                "pending", pending,
                "approved", approved,
                "disbursed", disbursed,
                "rejected", rejected,
                "cancelled", cancelled,
                "activePortfolio", portfolio);
    }

    // ================================================================
    // EMI PREVIEW
    // ================================================================
    @Transactional(readOnly = true)
    public Map<String, Object> emiPreview(BigDecimal amount, BigDecimal rate, int months) {
        if (amount.signum() <= 0 || rate.signum() <= 0 || months <= 0) {
            throw new IllegalArgumentException("amount, rate, months must be positive");
        }
        BigDecimal emi = computeEmi(amount, rate, months);
        BigDecimal total = emi.multiply(BigDecimal.valueOf(months));
        BigDecimal interest = total.subtract(amount);
        return Map.of(
                "amount", amount,
                "interestRate", rate,
                "tenureMonths", months,
                "monthlyEmi", emi,
                "totalPayable", total,
                "totalInterest", interest);
    }

    // ================================================================
    // HELPERS
    // ================================================================
    private Loan findPending(Long loanId) {
        Loan loan = loans.findById(loanId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));
        if (loan.getStatus() != LoanStatus.PENDING) {
            throw new IllegalStateException("Loan is not PENDING");
        }
        return loan;
    }

    private BigDecimal computeEmi(BigDecimal principal, BigDecimal annualRatePct, int months) {
        BigDecimal monthlyRate = annualRatePct
                .divide(BigDecimal.valueOf(1200), MathContext.DECIMAL64);
        if (monthlyRate.signum() == 0) {
            return principal.divide(BigDecimal.valueOf(months), 2, RoundingMode.HALF_UP);
        }
        BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate);
        BigDecimal pow = onePlusR.pow(months, MathContext.DECIMAL64);
        return principal.multiply(monthlyRate).multiply(pow)
                .divide(pow.subtract(BigDecimal.ONE), 2, RoundingMode.HALF_UP);
    }
    @Transactional
    public void markOverdueEmis() {
        LocalDate today = LocalDate.now();
        List<Loan> active = loans.findByStatus(LoanStatus.DISBURSED);
        for (Loan l : active) {
            for (LoanEmi e : emiRepo.findByLoanIdOrderByInstallmentNumber(l.getId())) {
                if (e.getStatus() == EmiStatus.UPCOMING
                        && e.getDueDate() != null
                        && e.getDueDate().isBefore(today)) {
                    e.setStatus(EmiStatus.OVERDUE);
                } else if (e.getStatus() == EmiStatus.UPCOMING
                        && e.getDueDate() != null
                        && !e.getDueDate().isAfter(today.plusDays(7))) {
                    e.setStatus(EmiStatus.DUE);
                }
            }
        }
    }
}