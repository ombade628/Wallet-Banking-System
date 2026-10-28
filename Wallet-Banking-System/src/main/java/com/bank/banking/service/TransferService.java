package com.bank.banking.service;

import com.bank.banking.exception.AccountNotFoundException;
import com.bank.banking.model.dto.TransferRequest;
import com.bank.banking.model.dto.TransferResponse;
import com.bank.banking.model.entity.Account;
import com.bank.banking.model.entity.LedgerEntry;
import com.bank.banking.model.entity.Transaction;
import com.bank.banking.model.entity.TransactionStatus;
import com.bank.banking.repository.AccountRepo;
import com.bank.banking.repository.LedgerEntryRepo;
import com.bank.banking.repository.TransactionRepo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
//import org.hibernate.query.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.bank.banking.model.dto.TransactionView;

@Service
public class TransferService {

	private final AccountRepo accounts;
	private final TransactionRepo transactions;
	private final LedgerEntryRepo ledger;
	private final LedgerService ledgerService;

	public TransferService(AccountRepo accounts, TransactionRepo transactions, LedgerEntryRepo ledger,
			LedgerService ledgerService) {
		this.accounts = accounts;
		this.transactions = transactions;
		this.ledger = ledger;
		this.ledgerService = ledgerService;
	}

	@Transactional(isolation = Isolation.READ_COMMITTED)
	public TransferResponse transfer(UUID ownerId, TransferRequest req) {
		// Idempotency
		return transactions.findByRequestId(req.requestId()).map(TransferResponse::from)
				.orElseGet(() -> doTransfer(ownerId, req));
	}

	@Transactional(readOnly = true)
	public Page<TransactionView> history(UUID ownerId, int page, int size) {
		return transactions.findByOwnerId(ownerId, PageRequest.of(page, size, Sort.by("createdAt").descending()))
				.map(TransactionView::from);
	}

	private TransferResponse doTransfer(UUID ownerId, TransferRequest req) {
		if (req.fromAccountId().equals(req.toAccountId()))
			throw new IllegalArgumentException("Cannot transfer to self");

		// Lock in deterministic order to avoid deadlocks
		UUID firstId = req.fromAccountId().compareTo(req.toAccountId()) < 0 ? req.fromAccountId() : req.toAccountId();
		UUID secondId = firstId.equals(req.fromAccountId()) ? req.toAccountId() : req.fromAccountId();

		Account first = accounts.findByIdForUpdate(firstId).orElseThrow(() -> new AccountNotFoundException(firstId));
		Account second = accounts.findByIdForUpdate(secondId).orElseThrow(() -> new AccountNotFoundException(secondId));

		Account from = first.getId().equals(req.fromAccountId()) ? first : second;
		Account to = first.getId().equals(req.toAccountId()) ? first : second;

		// Ownership check — only owner can initiate transfer from their account
		if (!from.getOwner().getId().equals(ownerId))
			throw new AccountNotFoundException(req.fromAccountId());

		if (!from.getCurrency().equals(to.getCurrency()))
			throw new IllegalArgumentException("Currency mismatch");

		from.debit(req.amount());
		to.credit(req.amount());
		
		BigDecimal fee = (BigDecimal) calculateFee(req.amount()).get("fee");
		if (fee.signum() > 0) {
		    from.debit(fee);
		    // Credit to a bank revenue account (you'd need to look this up by account number)
		    // For now, just record the fee in a separate transaction + ledger entry.
		    Transaction feeTxn = new Transaction(
		        "FEE-" + java.util.UUID.randomUUID(),
		        from, null, fee, from.getCurrency());
		    transactions.save(feeTxn);
		    ledger.save(LedgerEntry.debit(feeTxn, from, fee));
		}
		

		Transaction txn = new Transaction(req.requestId(), from, to, req.amount(), from.getCurrency());
		transactions.save(txn);

		ledger.save(LedgerEntry.debit(txn, from, req.amount()));
		ledger.save(LedgerEntry.credit(txn, to, req.amount()));
		ledgerService.validateBalanced(txn.getId());

		return TransferResponse.from(txn);
	}

	@Transactional(readOnly = true)
	public List<TransactionView> history(UUID ownerId) {
		return transactions.findHistoryByOwnerId(ownerId).stream().map(TransactionView::from).toList();
	}
	
	// ================================================================
	// Single-transaction lookups
	// ================================================================
	@Transactional(readOnly = true)
	public TransactionView getTransaction(UUID ownerId, UUID txnId) {
	    Transaction txn = transactions.findById(txnId)
	            .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
	    if (!txn.getFromAccount().getOwner().getId().equals(ownerId)
	            && !txn.getToAccount().getOwner().getId().equals(ownerId)) {
	        throw new IllegalArgumentException("Transaction not found");
	    }
	    return TransactionView.from(txn);
	}

	@Transactional(readOnly = true)
	public TransactionView getByRequestId(UUID ownerId, String requestId) {
	    Transaction txn = transactions.findByRequestId(requestId)
	            .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
	    boolean owns = (txn.getFromAccount() != null && txn.getFromAccount().getOwner().getId().equals(ownerId))
	            || (txn.getToAccount() != null && txn.getToAccount().getOwner().getId().equals(ownerId));
	    if (!owns) throw new IllegalArgumentException("Transaction not found");
	    return TransactionView.from(txn);
	}

	// ================================================================
	// Filtered search
	// ================================================================
	@Transactional(readOnly = true)
	public Page<TransactionView> search(UUID ownerId, int page, int size,
	                                    String direction, Instant from, Instant to,
	                                    BigDecimal minAmount, BigDecimal maxAmount, String q) {
	    return transactions.searchForOwner(
	            ownerId, direction, from, to, minAmount, maxAmount,
	            q == null ? null : "%" + q.toLowerCase() + "%",
	            PageRequest.of(page, size, Sort.by("createdAt").descending()))
	        .map(TransactionView::from);
	}

	// ================================================================
	// Cancel a pending transfer (no-op if already settled — real banks
	// only allow cancel while status is PENDING)
	// ================================================================
	@Transactional
	public TransferResponse cancel(UUID ownerId, UUID txnId) {
	    Transaction txn = transactions.findById(txnId)
	            .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
	    if (!txn.getFromAccount().getOwner().getId().equals(ownerId)) {
	        throw new IllegalArgumentException("Transaction not found");
	    }
	    if (txn.getStatus() != TransactionStatus.PENDING) {
	        throw new IllegalStateException("Only PENDING transactions can be cancelled");
	    }
	    // Reverse the debit/credit
	    Account from = accounts.findByIdForUpdate(txn.getFromAccount().getId())
	            .orElseThrow(() -> new IllegalArgumentException("Cannot lock from account"));
	    Account to = accounts.findByIdForUpdate(txn.getToAccount().getId())
	            .orElseThrow(() -> new IllegalArgumentException("Cannot lock to account"));
	    from.credit(txn.getAmount());
	    to.debit(txn.getAmount());
	    // New offsetting transaction
	    Transaction rev = new Transaction("CAN-" + UUID.randomUUID(), to, from,
	            txn.getAmount(), txn.getCurrency());
	    transactions.save(rev);
	    return TransferResponse.from(rev);
	}

	// ================================================================
	// Reverse a settled transfer within 15 minutes
	// ================================================================
	@Transactional
	public TransferResponse reverse(UUID ownerId, UUID txnId) {
	    Transaction txn = transactions.findById(txnId)
	            .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
	    if (!txn.getFromAccount().getOwner().getId().equals(ownerId)) {
	        throw new IllegalArgumentException("Transaction not found");
	    }
	    long ageMs = System.currentTimeMillis() - txn.getCreatedAt().toEpochMilli();
	    if (ageMs > 15 * 60 * 1000L) {
	        throw new IllegalStateException("Reversal window expired (15 min)");
	    }
	    Account from = accounts.findByIdForUpdate(txn.getFromAccount().getId())
	            .orElseThrow(() -> new IllegalArgumentException("Cannot lock from account"));
	    Account to = accounts.findByIdForUpdate(txn.getToAccount().getId())
	            .orElseThrow(() -> new IllegalArgumentException("Cannot lock to account"));
	    from.credit(txn.getAmount());
	    to.debit(txn.getAmount());

	    Transaction rev = new Transaction("REV-" + UUID.randomUUID(), to, from,
	            txn.getAmount(), txn.getCurrency());
	    transactions.save(rev);
	    ledger.save(LedgerEntry.debit(rev, to, txn.getAmount()));
	    ledger.save(LedgerEntry.credit(rev, from, txn.getAmount()));
	    return TransferResponse.from(rev);
	}

	// ================================================================
	// Statistics for the dashboard cards
	// ================================================================
	@Transactional(readOnly = true)
	public Map<String, Object> stats(UUID ownerId) {
	    long count = transactions.countByOwner(ownerId);
	    BigDecimal sent = transactions.sumSentByOwner(ownerId);
	    BigDecimal received = transactions.sumReceivedByOwner(ownerId);
	    return Map.of(
	            "totalCount", count,
	            "totalSent", sent == null ? BigDecimal.ZERO : sent,
	            "totalReceived", received == null ? BigDecimal.ZERO : received);
	}

	// ================================================================
	// Frequent counterparties
	// ================================================================
	@Transactional(readOnly = true)
	public List<Map<String, Object>> recentCounterparties(UUID ownerId) {
	    return transactions.findRecentCounterparties(ownerId, PageRequest.of(0, 10)).stream()
	            .map(row -> Map.<String, Object>of(
	                    "accountNumber", row[0],
	                    "ownerName", row[1],
	                    "lastDate", row[2]))
	            .toList();
	}

	// ================================================================
	// Admin: all transactions across the bank
	// ================================================================
	@Transactional(readOnly = true)
	public Page<TransactionView> allTransactions(int page, int size) {
	    return transactions.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))
	            .map(TransactionView::from);
	}
	// ================================================================
	// TRANSFER PREVIEW
	// ================================================================
	@Transactional(readOnly = true)
	public Map<String, Object> preview(UUID ownerId, TransferRequest req) {
	    if (req.fromAccountId().equals(req.toAccountId())) {
	        throw new IllegalArgumentException("Cannot transfer to self");
	    }
	    Account from = accounts.findById(req.fromAccountId())
	            .orElseThrow(() -> new AccountNotFoundException(req.fromAccountId()));
	    if (!from.getOwner().getId().equals(ownerId)) {
	        throw new AccountNotFoundException(req.fromAccountId());
	    }
	    Account to = accounts.findById(req.toAccountId())
	            .orElseThrow(() -> new AccountNotFoundException(req.toAccountId()));

	    BigDecimal fee = calculateFee(req.amount()).get("fee") instanceof BigDecimal b ? b : BigDecimal.ZERO;
	    BigDecimal totalDebit = req.amount().add(fee);
	    boolean sufficient = from.getBalance().compareTo(totalDebit) >= 0;

	    return Map.of(
	            "from", from.getAccountNumber(),
	            "fromOwner", from.getOwner().getFullName(),
	            "fromBalance", from.getBalance(),
	            "to", to.getAccountNumber(),
	            "toOwner", to.getOwner().getFullName(),
	            "amount", req.amount(),
	            "fee", fee,
	            "totalDebit", totalDebit,
	            "currency", from.getCurrency(),
	            "sufficientFunds", sufficient);
	}

	// ================================================================
	// FEE CALCULATION
	// ================================================================
	public Map<String, Object> calculateFee(BigDecimal amount) {
	    BigDecimal fee;
	    if (amount.compareTo(new BigDecimal("10000")) <= 0) fee = BigDecimal.ZERO;
	    else if (amount.compareTo(new BigDecimal("100000")) <= 0) fee = new BigDecimal("5.00");
	    else if (amount.compareTo(new BigDecimal("500000")) <= 0) fee = new BigDecimal("15.00");
	    else fee = new BigDecimal("50.00");
	    return Map.of(
	            "amount", amount,
	            "fee", fee,
	            "totalDebit", amount.add(fee));
	}

	// ================================================================
	// IDEMPOTENCY CHECK
	// ================================================================
	@Transactional(readOnly = true)
	public boolean requestIdExists(String requestId) {
	    return transactions.findByRequestId(requestId).isPresent();
	}

	// ================================================================
	// BULK TRANSFER (partial results)
	// ================================================================
	@Transactional
	public List<Map<String, Object>> bulkTransfer(UUID ownerId, List<TransferRequest> reqs) {
	    List<Map<String, Object>> results = new ArrayList<>();
	    for (TransferRequest req : reqs) {
	        try {
	            TransferResponse resp = transfer(ownerId, req);
	            results.add(Map.of(
	                    "requestId", req.requestId(),
	                    "status", "SUCCESS",
	                    "transactionId", resp.transactionId()));
	        } catch (Exception e) {
	            results.add(Map.of(
	                    "requestId", req.requestId(),
	                    "status", "FAILED",
	                    "error", e.getMessage() == null ? "unknown" : e.getMessage()));
	        }
	    }
	    return results;
	}

	// ================================================================
	// SCHEDULED TRANSFERS — in-memory only
	// ================================================================
	private final Map<UUID, List<Map<String, Object>>> scheduled = new java.util.concurrent.ConcurrentHashMap<>();

	public Map<String, Object> schedule(UUID ownerId, TransferRequest req, Instant executeAt) {
	    if (executeAt == null || executeAt.isBefore(Instant.now())) {
	        throw new IllegalArgumentException("executeAt must be in the future");
	    }
	    Map<String, Object> entry = Map.of(
	            "ownerId", ownerId,
	            "transfer", req,
	            "executeAt", executeAt.toString(),
	            "scheduledAt", Instant.now().toString(),
	            "status", "SCHEDULED");
	    scheduled.computeIfAbsent(ownerId, k -> new ArrayList<>()).add(entry);
	    return entry;
	}

	// ================================================================
	// TEMPLATES — in-memory only
	// ================================================================
	private final Map<UUID, Map<String, Map<String, Object>>> templates = new java.util.concurrent.ConcurrentHashMap<>();

	public Map<String, Object> saveTemplate(UUID ownerId, String nickname,
	                                        UUID fromAccountId, UUID toAccountId, BigDecimal amount) {
	    if (nickname == null || nickname.isBlank()) {
	        throw new IllegalArgumentException("nickname is required");
	    }
	    Map<String, Object> t = Map.of(
	            "nickname", nickname,
	            "fromAccountId", fromAccountId,
	            "toAccountId", toAccountId,
	            "amount", amount,
	            "savedAt", Instant.now().toString());
	    templates.computeIfAbsent(ownerId, k -> new java.util.concurrent.ConcurrentHashMap<>())
	            .put(nickname, t);
	    return t;
	}

	public List<Map<String, Object>> listTemplates(UUID ownerId) {
	    return new ArrayList<>(templates.getOrDefault(ownerId, Map.of()).values());
	}

	public void deleteTemplate(UUID ownerId, String nickname) {
	    templates.getOrDefault(ownerId, Map.of()).remove(nickname);
	}

	@Transactional
	public TransferResponse executeTemplate(UUID ownerId, String nickname) {
	    Map<String, Object> t = templates.getOrDefault(ownerId, Map.of()).get(nickname);
	    if (t == null) throw new IllegalArgumentException("Template not found: " + nickname);
	    TransferRequest req = new TransferRequest(
	            UUID.randomUUID().toString(),
	            (UUID) t.get("fromAccountId"),
	            (UUID) t.get("toAccountId"),
	            (BigDecimal) t.get("amount"));
	    return transfer(ownerId, req);
	}

	// ================================================================
	// MONTHLY STATEMENT
	// ================================================================
	@Transactional(readOnly = true)
	public Map<String, Object> monthlyStatement(UUID ownerId, int year, int month) {
	    java.time.YearMonth ym = java.time.YearMonth.of(year, month);
	    Instant from = ym.atDay(1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
	    Instant to = ym.atEndOfMonth().atTime(23, 59, 59).atZone(java.time.ZoneOffset.UTC).toInstant();

	    List<Transaction> list = transactions.findRecentByOwner(ownerId,
	            org.springframework.data.domain.PageRequest.of(0, 10_000)).stream()
	        .filter(t -> !t.getCreatedAt().isBefore(from) && !t.getCreatedAt().isAfter(to))
	        .toList();

	    BigDecimal sent = list.stream()
	            .filter(t -> t.getFromAccount() != null && t.getFromAccount().getOwner().getId().equals(ownerId))
	            .map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
	    BigDecimal received = list.stream()
	            .filter(t -> t.getToAccount() != null && t.getToAccount().getOwner().getId().equals(ownerId))
	            .map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

	    return Map.of(
	            "year", year,
	            "month", month,
	            "from", from.toString(),
	            "to", to.toString(),
	            "transactionCount", list.size(),
	            "totalSent", sent,
	            "totalReceived", received,
	            "netFlow", received.subtract(sent),
	            "transactions", list.stream().map(TransactionView::from).toList());
	}
}
