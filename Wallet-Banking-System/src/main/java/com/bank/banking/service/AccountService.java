package com.bank.banking.service;

import com.bank.banking.exception.AccountNotFoundException;
import com.bank.banking.model.dto.AccountResponse;
import com.bank.banking.model.dto.CreateAccountRequest;
import com.bank.banking.model.entity.Account;
import com.bank.banking.model.entity.User;
import com.bank.banking.repository.AccountRepo ;
import com.bank.banking.repository.UserRepo ;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
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

    public AccountService(AccountRepo  accounts, UserRepo users, TransactionRepo transactions) {
        this.accounts = accounts;
        this.users = users;
        this.transactions = transactions;
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

    @Transactional(readOnly = true)
    public AccountResponse get(UUID id, UUID ownerId) {
        Account a = accounts.findById(id)
            .orElseThrow(() -> new AccountNotFoundException(id));
        if (!a.getOwner().getId().equals(ownerId))
            throw new AccountNotFoundException(id);
        return AccountResponse.from(a);
    }

    private String generateAccountNumber() {
        long n = 1_000_000_000L + (long)(random.nextDouble() * 8_999_999_999L);
        return String.valueOf(n);
    }
}
