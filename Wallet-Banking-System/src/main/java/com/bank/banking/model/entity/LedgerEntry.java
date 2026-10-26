package com.bank.banking.model.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ledger_entries")
public class LedgerEntry {

	@Id
	@Column(columnDefinition = "CHAR(36)")
	private UUID id = UUID.randomUUID();

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "transaction_id", nullable = false)
	private Transaction transaction;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "account_id", nullable = false)
	private Account account;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 6)
	private LedgerDirection direction;

	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal amount;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected LedgerEntry() {
	}

	private LedgerEntry(Transaction txn, Account acc, LedgerDirection dir, BigDecimal amt) {
		this.transaction = txn;
		this.account = acc;
		this.direction = dir;
		this.amount = amt;
	}

	public static LedgerEntry debit(Transaction t, Account a, BigDecimal amt) {
		return new LedgerEntry(t, a, LedgerDirection.DEBIT, amt);
	}

	public static LedgerEntry credit(Transaction t, Account a, BigDecimal amt) {
		return new LedgerEntry(t, a, LedgerDirection.CREDIT, amt);
	}

	public UUID getId() {
		return id;
	}

	public Transaction getTransaction() {
		return transaction;
	}

	public Account getAccount() {
		return account;
	}

	public LedgerDirection getDirection() {
		return direction;
	}

	public BigDecimal getAmount() {
		return amount;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
