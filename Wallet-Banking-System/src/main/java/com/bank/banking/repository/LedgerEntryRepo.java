package com.bank.banking.repository;

import com.bank.banking.model.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LedgerEntryRepo extends JpaRepository<LedgerEntry, UUID> {
    List<LedgerEntry> findByTransactionId(UUID transactionId);
    List<LedgerEntry> findByAccountIdOrderByCreatedAtDesc(UUID accountId);
}