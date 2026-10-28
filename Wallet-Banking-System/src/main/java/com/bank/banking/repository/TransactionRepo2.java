package com.bank.banking.repository;

import com.bank.banking.model.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepo2 extends JpaRepository<Transaction, UUID> {

    // ==================================================================
    // BASIC LOOKUPS
    // ==================================================================
    Optional<Transaction> findByRequestId(String requestId);

    List<Transaction> findByFromAccountIdOrToAccountIdOrderByCreatedAtDesc(
            UUID fromAccountId, UUID toAccountId);

    @Query("select t from Transaction t " +
           "join fetch t.fromAccount join fetch t.toAccount " +
           "where t.fromAccount.owner.id = :ownerId or t.toAccount.owner.id = :ownerId " +
           "order by t.createdAt desc")
    List<Transaction> findHistoryByOwnerId(@Param("ownerId") UUID ownerId);

    @Query("select t from Transaction t " +
           "where t.fromAccount.owner.id = :ownerId or t.toAccount.owner.id = :ownerId " +
           "order by t.createdAt desc")
    Page<Transaction> findByOwnerId(@Param("ownerId") UUID ownerId, Pageable pageable);

    @Query("select t from Transaction t " +
           "where t.fromAccount.owner.id = :ownerId or t.toAccount.owner.id = :ownerId " +
           "order by t.createdAt desc")
    List<Transaction> findRecentByOwner(@Param("ownerId") UUID ownerId, Pageable pageable);

    @Query("select t from Transaction t " +
           "where t.fromAccount.id = :accountId or t.toAccount.id = :accountId " +
           "order by t.createdAt desc")
    Page<Transaction> findByAccountId(@Param("accountId") UUID accountId, Pageable pageable);

    // ==================================================================
    // CASHIER DRAWER (deposits / withdrawals / cheques / reversals)
    // ==================================================================
    @Query("select t from Transaction t " +
           "where t.createdAt >= :since and t.requestId like 'DEP-%' " +
           "order by t.createdAt desc")
    List<Transaction> findDepositsSince(@Param("since") Instant since);

    @Query("select t from Transaction t " +
           "where t.createdAt >= :since and t.requestId like 'WDR-%' " +
           "order by t.createdAt desc")
    List<Transaction> findWithdrawalsSince(@Param("since") Instant since);

    @Query("select t from Transaction t " +
           "where t.createdAt >= :since and t.requestId like 'CHQ-%' " +
           "order by t.createdAt desc")
    List<Transaction> findChequesSince(@Param("since") Instant since);

    @Query("select t from Transaction t " +
           "where t.createdAt >= :since and t.requestId like 'REV-%' " +
           "order by t.createdAt desc")
    List<Transaction> findReversalsSince(@Param("since") Instant since);

    // ==================================================================
    // SLIP / RECEIPT (eager-loads accounts + owner)
    // ==================================================================
    @Query("select t from Transaction t " +
           "left join fetch t.fromAccount fa left join fetch fa.owner " +
           "left join fetch t.toAccount ta left join fetch ta.owner " +
           "where t.id = :id")
    Optional<Transaction> findByIdWithAccounts(@Param("id") UUID id);

    // ==================================================================
    // FILTERED SEARCH — CALLER-SCOPED
    // ==================================================================
    @Query("select t from Transaction t " +
           "where (t.fromAccount.owner.id = :ownerId or t.toAccount.owner.id = :ownerId) " +
           "  and (:direction is null " +
           "       or (:direction = 'SENT'     and t.fromAccount.owner.id = :ownerId) " +
           "       or (:direction = 'RECEIVED' and t.toAccount.owner.id   = :ownerId)) " +
           "  and (:from is null      or t.createdAt >= :from) " +
           "  and (:to   is null      or t.createdAt <= :to) " +
           "  and (:minAmount is null or t.amount    >= :minAmount) " +
           "  and (:maxAmount is null or t.amount    <= :maxAmount) " +
           "  and (:q is null " +
           "       or lower(t.requestId)               like :q " +
           "       or lower(t.fromAccount.accountNumber) like :q " +
           "       or lower(t.toAccount.accountNumber)   like :q)")
    Page<Transaction> searchForOwner(
            @Param("ownerId") UUID ownerId,
            @Param("direction") String direction,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount,
            @Param("q") String q,
            Pageable pageable);

    // ==================================================================
    // FILTERED SEARCH — BANK-WIDE (no ownership)
    // ==================================================================
    @Query("select t from Transaction t " +
           "where (:direction is null " +
           "       or (:direction = 'SENT'     and t.fromAccount is not null) " +
           "       or (:direction = 'RECEIVED' and t.toAccount   is not null)) " +
           "  and (:from is null      or t.createdAt >= :from) " +
           "  and (:to   is null      or t.createdAt <= :to) " +
           "  and (:minAmount is null or t.amount    >= :minAmount) " +
           "  and (:maxAmount is null or t.amount    <= :maxAmount) " +
           "  and (:q is null " +
           "       or lower(t.requestId)               like :q " +
           "       or lower(t.fromAccount.accountNumber) like :q " +
           "       or lower(t.toAccount.accountNumber)   like :q)")
    Page<Transaction> searchAll(
            @Param("direction") String direction,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount,
            @Param("q") String q,
            Pageable pageable);

    // ==================================================================
    // STATS
    // ==================================================================
    @Query("select count(t) from Transaction t " +
           "where t.fromAccount.owner.id = :ownerId or t.toAccount.owner.id = :ownerId")
    long countByOwner(@Param("ownerId") UUID ownerId);

    @Query("select coalesce(sum(t.amount),0) from Transaction t " +
           "where t.fromAccount.owner.id = :ownerId")
    BigDecimal sumSentByOwner(@Param("ownerId") UUID ownerId);

    @Query("select coalesce(sum(t.amount),0) from Transaction t " +
           "where t.toAccount.owner.id = :ownerId")
    BigDecimal sumReceivedByOwner(@Param("ownerId") UUID ownerId);

    @Query("select coalesce(sum(t.amount),0) from Transaction t " +
           "where t.createdAt >= :since")
    BigDecimal sumAmountSince(@Param("since") Instant since);

    @Query("select count(t) from Transaction t where t.createdAt >= :since")
    long countSince(@Param("since") Instant since);

    @Query("select coalesce(sum(t.amount),0) from Transaction t " +
           "where t.createdAt >= :from and t.createdAt <= :to")
    BigDecimal sumAmountBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("select count(t) from Transaction t " +
           "where t.createdAt >= :from and t.createdAt <= :to")
    long countBetween(@Param("from") Instant from, @Param("to") Instant to);

    // ==================================================================
    // FREQUENT COUNTERPARTIES
    // ==================================================================
    @Query("select " +
           "case when t.fromAccount.owner.id = :ownerId " +
           "     then t.toAccount.accountNumber else t.fromAccount.accountNumber end, " +
           "case when t.fromAccount.owner.id = :ownerId " +
           "     then t.toAccount.owner.fullName else t.fromAccount.owner.fullName end, " +
           "max(t.createdAt) " +
           "from Transaction t " +
           "where t.fromAccount.owner.id = :ownerId or t.toAccount.owner.id = :ownerId " +
           "group by " +
           "case when t.fromAccount.owner.id = :ownerId " +
           "     then t.toAccount.accountNumber else t.fromAccount.accountNumber end, " +
           "case when t.fromAccount.owner.id = :ownerId " +
           "     then t.toAccount.owner.fullName else t.fromAccount.owner.fullName end " +
           "order by max(t.createdAt) desc")
    List<Object[]> findRecentCounterparties(@Param("ownerId") UUID ownerId, Pageable pageable);
}