package com.bank.banking.repository;

import com.bank.banking.model.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface LedgerEntryRepo extends JpaRepository<LedgerEntry, UUID> {
	List<LedgerEntry> findByTransactionId(UUID transactionId);

	List<LedgerEntry> findByAccountIdOrderByCreatedAtDesc(UUID accountId);

 
	@Query("select e from LedgerEntry e " +
		       "where e.account.id = :accountId " +
		       "  and e.createdAt >= :from " +
		       "  and e.createdAt <= :to " +
		       "order by e.createdAt desc")
		List<LedgerEntry> findForAccountBetween(
		        @Param("accountId") UUID accountId,
		        @Param("from") Instant from,
		        @Param("to") Instant to);
}