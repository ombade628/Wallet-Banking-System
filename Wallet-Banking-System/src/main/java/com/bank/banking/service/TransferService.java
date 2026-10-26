package com.bank.banking.service;

import com.bank.banking.exception.AccountNotFoundException;
import com.bank.banking.model.dto.TransferRequest;
import com.bank.banking.model.dto.TransferResponse;
import com.bank.banking.model.entity.Account;
import com.bank.banking.model.entity.LedgerEntry;
import com.bank.banking.model.entity.Transaction;
import com.bank.banking.repository.AccountRepo ;
import com.bank.banking.repository.LedgerEntryRepo ;
import com.bank.banking.repository.TransactionRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.List;
import com.bank.banking.model.dto.TransactionView;

@Service
public class TransferService {

    private final AccountRepo accounts;
    private final TransactionRepo transactions;
    private final LedgerEntryRepo ledger;
    private final LedgerService ledgerService;

    public TransferService(AccountRepo accounts,
                           TransactionRepo transactions,
                           LedgerEntryRepo ledger, LedgerService ledgerService) {
        this.accounts = accounts;
        this.transactions = transactions;
        this.ledger = ledger;
        this.ledgerService = ledgerService;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public TransferResponse transfer(UUID ownerId, TransferRequest req) {
        // Idempotency
        return transactions.findByRequestId(req.requestId())
            .map(TransferResponse::from)
            .orElseGet(() -> doTransfer(ownerId, req));
    }

    private TransferResponse doTransfer(UUID ownerId, TransferRequest req) {
        if (req.fromAccountId().equals(req.toAccountId()))
            throw new IllegalArgumentException("Cannot transfer to self");

        // Lock in deterministic order to avoid deadlocks
        UUID firstId  = req.fromAccountId().compareTo(req.toAccountId()) < 0
                        ? req.fromAccountId() : req.toAccountId();
        UUID secondId = firstId.equals(req.fromAccountId())
                        ? req.toAccountId() : req.fromAccountId();

        Account first  = accounts.findByIdForUpdate(firstId)
            .orElseThrow(() -> new AccountNotFoundException(firstId));
        Account second = accounts.findByIdForUpdate(secondId)
            .orElseThrow(() -> new AccountNotFoundException(secondId));

        Account from = first.getId().equals(req.fromAccountId()) ? first : second;
        Account to   = first.getId().equals(req.toAccountId())   ? first : second;

        // Ownership check — only owner can initiate transfer from their account
        if (!from.getOwner().getId().equals(ownerId))
            throw new AccountNotFoundException(req.fromAccountId());

        if (!from.getCurrency().equals(to.getCurrency()))
            throw new IllegalArgumentException("Currency mismatch");

        from.debit(req.amount());
        to.credit(req.amount());

        Transaction txn = new Transaction(
            req.requestId(), from, to, req.amount(), from.getCurrency());
        transactions.save(txn);

        ledger.save(LedgerEntry.debit(txn, from, req.amount()));
        ledger.save(LedgerEntry.credit(txn, to, req.amount()));
        ledgerService.validateBalanced(txn.getId());

        return TransferResponse.from(txn);
    }

    @Transactional(readOnly = true)
    public List<TransactionView> history(UUID ownerId) { return transactions.findHistoryByOwnerId(ownerId).stream().map(TransactionView::from).toList(); }
}
