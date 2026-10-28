package com.bank.banking.service;

import com.bank.banking.exception.AccountNotFoundException;
import com.bank.banking.model.dto.AccountResponse;
import com.bank.banking.model.dto.CreateAccountRequest;
import com.bank.banking.model.entity.Account;
import com.bank.banking.model.entity.AccountStatus;
import com.bank.banking.model.entity.LedgerDirection;
import com.bank.banking.model.entity.LedgerEntry;
import com.bank.banking.model.entity.User;
import com.bank.banking.repository.AccountRepo ;
import com.bank.banking.repository.LedgerEntryRepo;
import com.bank.banking.repository.UserRepo ;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;
import com.bank.banking.model.dto.TransactionView;
import com.bank.banking.repository.TransactionRepo;

@Service
public class AccountService {

    private final AccountRepo  accounts;
    private final UserRepo  users;
    private final SecureRandom random = new SecureRandom();
    private final TransactionRepo transactions;
    private final LedgerEntryRepo ledgerRepo;
    private final AuditService audit;

    public AccountService(AccountRepo  accounts
    		, UserRepo users
    		, TransactionRepo transactions
    		, LedgerEntryRepo ledgerRepo
    		, AuditService audit) {
        this.accounts = accounts;
        this.users = users;
        this.transactions = transactions;
		this.ledgerRepo = ledgerRepo;
		this.audit = audit ; 
		
    }

    @Transactional(readOnly = true) public Optional<AccountLookup> lookup(String accountNumber) { return accounts.findByAccountNumber(accountNumber).map(a -> new AccountLookup(a.getId(), a.getOwner().getFullName())); }
    @Transactional(readOnly = true) public List<TransactionView> history(UUID accountId) { return transactions.findByFromAccountIdOrToAccountIdOrderByCreatedAtDesc(accountId, accountId).stream().map(TransactionView::from).toList(); }
    public record AccountLookup(UUID id, String ownerName) { }

    @Transactional
    public AccountResponse create(UUID ownerId, CreateAccountRequest req) {
        User owner = users.findById(ownerId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String currency = req.currency() == null ? "INR" : req.currency().toUpperCase();
        Account a = new Account(owner, req.type(), generateAccountNumber(), currency);
        return AccountResponse.from(accounts.save(a));
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> listOwned(UUID ownerId) {
        return accounts.findByOwnerId(ownerId).stream()
            .map(AccountResponse::from).toList();
    }
    
    @Transactional
    public AccountResponse activate(UUID id, UUID ownerId) {
        Account a = accounts.findById(id)
            .orElseThrow(() -> new AccountNotFoundException(id));
        if (!a.getOwner().getId().equals(ownerId))
            throw new AccountNotFoundException(id);
        a.setStatus(AccountStatus.ACTIVE);
        return AccountResponse.from(a);
    }
    @Transactional(readOnly = true)
    public AccountResponse get(UUID id, UUID ownerId) {
        Account a = accounts.findById(id)
            .orElseThrow(() -> new AccountNotFoundException(id));
        if (!a.getOwner().getId().equals(ownerId))
            throw new AccountNotFoundException(id);
        return AccountResponse.from(a);
    }

    private String generateAccountNumber() {
        for (int i = 0; i < 10; i++) {
            long n = 1_000_000_000L + (long)(random.nextDouble() * 8_999_999_999L);
            String candidate = String.valueOf(n);
            if (accounts.findByAccountNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not allocate a unique account number");
    }
    @Transactional
    public void freeze(UUID id) {
        Account a = accounts.findById(id)
                .orElseThrow(() -> new AccountNotFoundException(id));
        a.freeze();
    }

    @Transactional
    public void unfreeze(UUID id) {
        Account a = accounts.findById(id)
                .orElseThrow(() -> new AccountNotFoundException(id));
        a.unfreeze();
    }
    
 // ---------- existing: create, listOwned, get, lookup, history, activate, freeze, unfreeze ----------

    @Transactional
    public void close(UUID id, UUID ownerId) {
        Account a = accounts.findById(id)
                .orElseThrow(() -> new AccountNotFoundException(id));
        if (!a.getOwner().getId().equals(ownerId))
            throw new AccountNotFoundException(id);
        a.close();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> totalBalance(UUID ownerId) {
        List<Account> list = accounts.findByOwnerId(ownerId);
        BigDecimal total = list.stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return Map.of(
                "totalBalance", total,
                "currency", "INR",
                "activeAccounts", list.stream().filter(a -> a.getStatus() == AccountStatus.ACTIVE).count(),
                "allAccounts", list.size());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> summary(UUID ownerId) {
        List<Account> list = accounts.findByOwnerId(ownerId);
        Map<String, Long> byStatus = list.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        a -> a.getStatus().name(),
                        java.util.stream.Collectors.counting()));
        Map<String, Long> byType = list.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        a -> a.getType().name(),
                        java.util.stream.Collectors.counting()));
        return Map.of(
                "total", list.size(),
                "byStatus", byStatus,
                "byType", byType);
    }

    // ---------- BANK-only ----------
    @Transactional(readOnly = true)
    public List<AccountResponse> listAll() {
        return accounts.findAll().stream().map(AccountResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse adminGet(UUID id) {
        return AccountResponse.from(accounts.findById(id)
                .orElseThrow(() -> new AccountNotFoundException(id)));
    }

    @Transactional
    public AccountResponse adminActivate(UUID id) {
        Account a = accounts.findById(id)
                .orElseThrow(() -> new AccountNotFoundException(id));
        a.setStatus(AccountStatus.ACTIVE);
        return AccountResponse.from(a);
    }

    @Transactional
    public void adminClose(UUID id) {
        Account a = accounts.findById(id)
                .orElseThrow(() -> new AccountNotFoundException(id));
        a.close();
    }

    @Transactional
    public AccountResponse adjustBalance(UUID id, BigDecimal delta, String reason) {
        Account a = accounts.findByIdForUpdate(id)
                .orElseThrow(() -> new AccountNotFoundException(id));
        if (delta.signum() > 0) {
            a.credit(delta);
        } else if (delta.signum() < 0) {
            a.debit(delta.negate());
        }
        audit.log(null, "ADJUST_BALANCE", "Account", id.toString(),
        	    "delta=" + delta + " reason=" + (reason == null ? "manual" : reason));
        return AccountResponse.from(a);
    }
    
 // AccountService.java — ADD these methods

    /**
     * Returns accounts matching the given status string (e.g. "PENDING", "ACTIVE").
     * Returns all accounts if status is null/blank.
     */
    @Transactional(readOnly = true)
    public List<AccountResponse> byStatus(String status) {
    	if(status == null || status.isBlank() || status.equalsIgnoreCase("ALL")) {
            return accounts.findAll().stream().map(AccountResponse::from).toList();
        }
        AccountStatus target;
        try {
            target = AccountStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid account status: " + status);
        }
        return accounts.findAll().stream()
                .filter(a -> a.getStatus() == target)
                .map(AccountResponse::from)
                .toList();
    }

    /**
     * Count of accounts currently in the given status.
     */
     
    @Transactional(readOnly = true)
    public long countByStatus(String status) {
        if (status == null || status.isBlank()) {
            return accounts.count();
        }
        AccountStatus target = AccountStatus.valueOf(status.toUpperCase());
        return accounts.findAll().stream()
                .filter(a -> a.getStatus() == target)
                .count();
    }

    @Transactional(readOnly = true)
    public AccountResponse getById(UUID id) {
        return AccountResponse.from(
                accounts.findById(id).orElseThrow(() -> new AccountNotFoundException(id)));
    }

    @Transactional
    public AccountResponse suspend(UUID id, UUID callerId) {
        Account a = accounts.findById(id)
                .orElseThrow(() -> new AccountNotFoundException(id));
        if (!a.getOwner().getId().equals(callerId)) {
            throw new AccountNotFoundException(id);
        }
        a.freeze();
        return AccountResponse.from(a);
    }
    
    @Transactional(readOnly = true)
    public Map<String, Object> statement(UUID accountId, UUID ownerId, int year, int month) {
        Account a = accounts.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId));
        if (!a.getOwner().getId().equals(ownerId)) {
            throw new AccountNotFoundException(accountId);
        }

        java.time.YearMonth ym = java.time.YearMonth.of(year, month);
        var from = ym.atDay(1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
        var to = ym.atEndOfMonth().atTime(23, 59, 59).atZone(java.time.ZoneOffset.UTC).toInstant();

        List<LedgerEntry> entries = ledgerRepo.findByAccountIdOrderByCreatedAtDesc(accountId).stream()
                .filter(e -> !e.getCreatedAt().isBefore(from) && !e.getCreatedAt().isAfter(to))
                .toList();

        BigDecimal debits = entries.stream()
                .filter(e -> e.getDirection() == LedgerDirection.DEBIT)
                .map(LedgerEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal credits = entries.stream()
                .filter(e -> e.getDirection() == LedgerDirection.CREDIT)
                .map(LedgerEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        return Map.of(
                "accountNumber", a.getAccountNumber(),
                "year", year, "month", month,
                "entryCount", entries.size(),
                "totalDebits", debits,
                "totalCredits", credits,
                "netFlow", credits.subtract(debits),
                "closingBalance", a.getBalance());
    }
    
}
