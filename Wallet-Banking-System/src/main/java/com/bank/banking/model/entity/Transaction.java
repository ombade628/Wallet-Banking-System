package com.bank.banking.model.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "transactions")
public class Transaction {

	@Id
	@Column(columnDefinition = "CHAR(36)")
	private UUID id = UUID.randomUUID();

	@Column(name = "request_id", nullable = false, unique = true, length = 64)
	private String requestId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "from_account_id")
	private Account fromAccount;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "to_account_id")
	private Account toAccount;

	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal amount;

	@Column(nullable = false, columnDefinition = "CHAR(3)")
	private String currency;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private TransactionStatus status;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected Transaction() {
	}

	public Transaction(String requestId, Account from, Account to, BigDecimal amount, String currency) {
		this.requestId = requestId;
		this.fromAccount = from;
		this.toAccount = to;
		this.amount = amount;
		this.currency = currency;
		this.status = TransactionStatus.COMPLETED;
	}

	public UUID getId() {
		return id;
	}

	public String getRequestId() {
		return requestId;
	}

	public Account getFromAccount() {
		return fromAccount;
	}

	public Account getToAccount() {
		return toAccount;
	}

	public BigDecimal getAmount() {
		return amount;
	}

	public String getCurrency() {
		return currency;
	}

	public TransactionStatus getStatus() {
		return status;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
