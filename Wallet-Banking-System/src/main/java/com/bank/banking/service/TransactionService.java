package com.bank.banking.service;

import com.bank.banking.model.dto.DepositRequest;
import com.bank.banking.model.dto.DepositResponse;
import com.bank.banking.model.dto.TransactionResponse;
import com.bank.banking.model.dto.TransactionView;
import com.bank.banking.model.entity.Account;
import com.bank.banking.model.entity.LedgerEntry;
import com.bank.banking.model.entity.Transaction;
import com.bank.banking.repository.AccountRepo;
import com.bank.banking.repository.LedgerEntryRepo;
import com.bank.banking.repository.TransactionRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class TransactionService {

    private final AccountRepo accounts;
    private final TransactionRepo transactions;
    private final LedgerEntryRepo ledger;

    public TransactionService(AccountRepo accounts, TransactionRepo transactions, LedgerEntryRepo ledger) {
        this.accounts = accounts;
        this.transactions = transactions;
        this.ledger = ledger;
    }

    // ==========================================================
    // DEPOSIT
    // ==========================================================
    @Transactional
    public DepositResponse deposit(DepositRequest req) {
        Account a = accounts.findByAccountNumber(req.accountNumber())
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        Account locked = accounts.findByIdForUpdate(a.getId())
                .orElseThrow(() -> new IllegalArgumentException("Unable to lock account"));
        locked.credit(req.amount());

        Transaction txn = new Transaction("DEP-" + UUID.randomUUID(), null, locked,
                req.amount(), locked.getCurrency());
        transactions.save(txn);
        ledger.save(LedgerEntry.credit(txn, locked, req.amount()));

        return new DepositResponse(
                txn.getRequestId(),
                locked.getAccountNumber(),
                locked.getOwner().getFullName(),
                req.amount(),
                locked.getBalance(),
                "DEPOSIT",
                Instant.now());
    }

    // ==========================================================
    // WITHDRAW
    // ==========================================================
    @Transactional
    public TransactionResponse withdraw(String accountNumber, BigDecimal amount) {
        Account a = accounts.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        Account locked = accounts.findByIdForUpdate(a.getId())
                .orElseThrow(() -> new IllegalArgumentException("Unable to lock account"));
        locked.debit(amount);

        Transaction txn = new Transaction("WDR-" + UUID.randomUUID(), locked, null,
                amount, locked.getCurrency());
        transactions.save(txn);
        ledger.save(LedgerEntry.debit(txn, locked, amount));

        return new TransactionResponse(txn.getRequestId(), locked.getAccountNumber(),
                amount, locked.getBalance(), "WITHDRAW", Instant.now());
    }

    // ==========================================================
    // BATCH DEPOSIT
    // ==========================================================
    @Transactional
    public List<DepositResponse> batchDeposit(List<DepositRequest> reqs) {
        List<DepositResponse> responses = new ArrayList<>();
        for (DepositRequest req : reqs) {
            responses.add(deposit(req));
        }
        return responses;
    }

    // ==========================================================
    // REVERSAL within 15-minute window
    // ==========================================================
    @Transactional
    public TransactionResponse reverse(UUID txnId) {
        Transaction original = transactions.findById(txnId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        long ageMs = System.currentTimeMillis() - original.getCreatedAt().toEpochMilli();
        if (ageMs > 15 * 60 * 1000L) {
            throw new IllegalStateException("Reversal window expired (15 minutes)");
        }
        if (original.getRequestId().startsWith("REV-")) {
            throw new IllegalStateException("Cannot reverse a reversal");
        }

        UUID fromId = original.getFromAccount() != null ? original.getFromAccount().getId() : null;
        UUID toId = original.getToAccount() != null ? original.getToAccount().getId() : null;

        // Lock in UUID order to prevent deadlocks
        UUID first = null, second = null;
        if (fromId != null && toId != null) {
            if (fromId.compareTo(toId) < 0) { first = fromId; second = toId; }
            else { first = toId; second = fromId; }
        } else { first = fromId != null ? fromId : toId; }

        accounts.findByIdForUpdate(first);
        if (second != null) accounts.findByIdForUpdate(second);
        
        

        Transaction rev = new Transaction(
                "REV-" + UUID.randomUUID(),
                original.getToAccount(),
                original.getFromAccount(),
                original.getAmount(),
                original.getCurrency());
        transactions.save(rev);

        if (original.getFromAccount() != null) {
            ledger.save(LedgerEntry.debit(rev, original.getFromAccount(), original.getAmount()));
        }
        if (original.getToAccount() != null) {
            ledger.save(LedgerEntry.credit(rev, original.getToAccount(), original.getAmount()));
        }

        return new TransactionResponse(rev.getRequestId(), "", original.getAmount(),
                null, "REVERSAL", Instant.now());
    }

    // ==========================================================
    // CHEQUE CLEARANCE
    // ==========================================================
    @Transactional
    public TransactionResponse chequeClear(String accountNumber, BigDecimal amount) {
        Account a = accounts.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        Account locked = accounts.findByIdForUpdate(a.getId())
                .orElseThrow(() -> new IllegalArgumentException("Unable to lock account"));
        locked.debit(amount);

        Transaction txn = new Transaction("CHQ-" + UUID.randomUUID(), locked, null,
                amount, locked.getCurrency());
        transactions.save(txn);
        ledger.save(LedgerEntry.debit(txn, locked, amount));

        return new TransactionResponse(txn.getRequestId(), locked.getAccountNumber(),
                amount, locked.getBalance(), "CHEQUE_CLEARANCE", Instant.now());
    }

    // ==========================================================
    // DRAWER TOTALS
    // ==========================================================
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> drawerTotals() {
        Instant since = java.time.LocalDate.now()
                .atStartOfDay(java.time.ZoneOffset.UTC).toInstant();

        List<Transaction> deposits = transactions.findDepositsSince(since);
        List<Transaction> withdrawals = transactions.findWithdrawalsSince(since);
        List<Transaction> cheques = transactions.findChequesSince(since);

        BigDecimal depTotal = deposits.stream().map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal wdrTotal = withdrawals.stream().map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal chqTotal = cheques.stream().map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netCash = depTotal.subtract(wdrTotal).subtract(chqTotal);

        return java.util.Map.of(
                "date", java.time.LocalDate.now().toString(),
                "depositCount", deposits.size(),
                "depositTotal", depTotal,
                "withdrawCount", withdrawals.size(),
                "withdrawTotal", wdrTotal,
                "chequeCount", cheques.size(),
                "chequeTotal", chqTotal,
                "netCash", netCash);
    }

    // ==========================================================
    // SLIP DATA
    // ==========================================================
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> slipData(UUID txnId) {
        Transaction txn = transactions.findById(txnId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        String accountNumber = txn.getToAccount() != null
                ? txn.getToAccount().getAccountNumber()
                : txn.getFromAccount() != null
                ? txn.getFromAccount().getAccountNumber()
                : "";
        String ownerName = txn.getToAccount() != null
                ? txn.getToAccount().getOwner().getFullName()
                : txn.getFromAccount() != null
                ? txn.getFromAccount().getOwner().getFullName()
                : "";

        return java.util.Map.of(
                "reference", txn.getRequestId(),
                "accountNumber", accountNumber,
                "ownerName", ownerName,
                "amount", txn.getAmount(),
                "currency", txn.getCurrency(),
                "status", txn.getStatus().toString(),
                "createdAt", txn.getCreatedAt().toString());
    }

    // ================================================================
    // 1. GET ONE (ownership-checked)
    // ================================================================
    @Transactional(readOnly = true)
    public TransactionView getForCaller(UUID id, UUID callerId, boolean isBank) {
        Transaction t = transactions.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
        if (!isBank && !involves(t, callerId)) {
            throw new IllegalArgumentException("Transaction not found");
        }
        return TransactionView.from(t);
    }

    // ================================================================
    // 2. GET BY REQUEST ID (ownership-checked)
    // ================================================================
    @Transactional(readOnly = true)
    public TransactionView getByRequestIdForCaller(String requestId, UUID callerId, boolean isBank) {
        Transaction t = transactions.findByRequestId(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
        if (!isBank && !involves(t, callerId)) {
            throw new IllegalArgumentException("Transaction not found");
        }
        return TransactionView.from(t);
    }

    // ================================================================
    // 3. SEARCH (caller-scoped)
    // ================================================================
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<TransactionView> searchForCaller(
            UUID callerId, int page, int size,
            String direction, java.time.Instant from, java.time.Instant to,
            BigDecimal minAmount, BigDecimal maxAmount, String q) {
        return transactions.searchForOwner(
                callerId,
                direction == null ? null : direction.toUpperCase(),
                from, to, minAmount, maxAmount,
                q == null || q.isBlank() ? null : "%" + q.trim().toLowerCase() + "%",
                org.springframework.data.domain.PageRequest.of(
                        page, size,
                        org.springframework.data.domain.Sort.by("createdAt").descending()))
            .map(TransactionView::from);
    }

    // ================================================================
    // 4. STATS (caller)
    // ================================================================
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> statsForCaller(UUID callerId) {
        long count = transactions.countByOwner(callerId);
        BigDecimal sent = transactions.sumSentByOwner(callerId);
        BigDecimal received = transactions.sumReceivedByOwner(callerId);
        return java.util.Map.of(
                "totalCount", count,
                "totalSent", sent == null ? BigDecimal.ZERO : sent,
                "totalReceived", received == null ? BigDecimal.ZERO : received);
    }

    // ================================================================
    // 5. RECENT COUNTERPARTIES
    // ================================================================
    @Transactional(readOnly = true)
    public java.util.List<java.util.Map<String, Object>> recentCounterpartiesForCaller(UUID callerId) {
        return transactions.findRecentCounterparties(
                callerId,
                org.springframework.data.domain.PageRequest.of(0, 10)).stream()
            .map(row -> java.util.Map.<String, Object>of(
                    "accountNumber", row[0],
                    "ownerName", row[1],
                    "lastDate", row[2] == null ? "" : row[2].toString()))
            .toList();
    }

    // ================================================================
    // 6. RECENT N
    // ================================================================
    @Transactional(readOnly = true)
    public java.util.List<TransactionView> recentForCaller(UUID callerId, int limit) {
        return transactions.findRecentByOwner(
                callerId,
                org.springframework.data.domain.PageRequest.of(0, limit)).stream()
            .map(TransactionView::from)
            .toList();
    }

    // ================================================================
    // 7. PER-ACCOUNT HISTORY (ownership enforced)
    // ================================================================
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<TransactionView> byAccountForCaller(
            UUID accountId, UUID callerId, boolean isBank, int page, int size) {
        var acc = accounts.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (!isBank && !acc.getOwner().getId().equals(callerId)) {
            throw new IllegalArgumentException("Account not found");
        }
        return transactions.findByAccountId(
                accountId,
                org.springframework.data.domain.PageRequest.of(
                        page, size,
                        org.springframework.data.domain.Sort.by("createdAt").descending()))
            .map(TransactionView::from);
    }

    // ================================================================
    // 8. BANK: ALL PAGED
    // ================================================================
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<TransactionView> allPaged(int page, int size) {
        return transactions.findAll(
                org.springframework.data.domain.PageRequest.of(
                        page, size,
                        org.springframework.data.domain.Sort.by("createdAt").descending()))
            .map(TransactionView::from);
    }

    // ================================================================
    // 9. BANK: SEARCH (no ownership)
    // ================================================================
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<TransactionView> adminSearch(
            int page, int size, String direction,
            java.time.Instant from, java.time.Instant to,
            BigDecimal minAmount, BigDecimal maxAmount, String q) {
        return transactions.searchAll(
                direction == null ? null : direction.toUpperCase(),
                from, to, minAmount, maxAmount,
                q == null || q.isBlank() ? null : "%" + q.trim().toLowerCase() + "%",
                org.springframework.data.domain.PageRequest.of(
                        page, size,
                        org.springframework.data.domain.Sort.by("createdAt").descending()))
            .map(TransactionView::from);
    }

    // ================================================================
    // 10. BANK: DAILY TOTALS
    // ================================================================
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> dailyTotals() {
        java.time.Instant since = java.time.LocalDate.now()
                .atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
        BigDecimal total = transactions.sumAmountSince(since);
        long count = transactions.countSince(since);
        return java.util.Map.of(
                "date", java.time.LocalDate.now().toString(),
                "count", count,
                "total", total == null ? BigDecimal.ZERO : total);
    }

    // ================================================================
    // 11. BANK: VOLUME BETWEEN TWO TIMESTAMPS
    // ================================================================
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> volumeBetween(java.time.Instant from, java.time.Instant to) {
        BigDecimal total = transactions.sumAmountBetween(from, to);
        long count = transactions.countBetween(from, to);
        return java.util.Map.of(
                "from", from.toString(),
                "to", to.toString(),
                "count", count,
                "total", total == null ? BigDecimal.ZERO : total);
    }

    // ================================================================
    // helper
    // ================================================================
    private boolean involves(Transaction t, UUID callerId) {
        return (t.getFromAccount() != null
                && t.getFromAccount().getOwner().getId().equals(callerId))
            || (t.getToAccount() != null
                && t.getToAccount().getOwner().getId().equals(callerId));
    }
}