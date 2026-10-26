package com.bank.banking.repository;

import com.bank.banking.model.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;

public interface TransactionRepo extends JpaRepository<Transaction, UUID> {
    Optional<Transaction> findByRequestId(String requestId);
    List<Transaction> findByFromAccountIdOrToAccountIdOrderByCreatedAtDesc(
        UUID fromAccountId, UUID toAccountId);
    @Query("select t from Transaction t join fetch t.fromAccount join fetch t.toAccount where t.fromAccount.owner.id = :ownerId or t.toAccount.owner.id = :ownerId order by t.createdAt desc")
    List<Transaction> findHistoryByOwnerId(UUID ownerId);
}
