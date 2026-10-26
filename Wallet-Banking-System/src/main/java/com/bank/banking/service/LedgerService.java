package com.bank.banking.service;

import com.bank.banking.model.entity.LedgerEntry;
import com.bank.banking.repository.LedgerEntryRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.UUID;

@Service
public class LedgerService {
    private final LedgerEntryRepo entries;
    public LedgerService(LedgerEntryRepo entries) { this.entries = entries; }
    @Transactional(readOnly = true) public void validateBalanced(UUID transactionId) { BigDecimal total = entries.findByTransactionId(transactionId).stream().map(e -> e.getDirection().name().equals("DEBIT") ? e.getAmount().negate() : e.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add); if (total.signum() != 0) throw new IllegalStateException("Unbalanced ledger transaction"); }
}
