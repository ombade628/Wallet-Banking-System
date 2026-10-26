package com.bank.banking.model.entity;

import com.bank.banking.exception.InsufficientBalanceException;
import com.bank.banking.exception.AccountFrozenException;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "accounts")
public class Account {

	@Id
	@JdbcTypeCode(SqlTypes.CHAR) // <-- ADD THIS LINE
	@Column(columnDefinition = "CHAR(36)")
	private UUID id = UUID.randomUUID();

	@Column(name = "account_number", nullable = false, unique = true, length = 20)
	private String accountNumber;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "owner_id", nullable = false)
	private User owner;

	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal balance = BigDecimal.ZERO;

	@Column(nullable = false, columnDefinition = "CHAR(3)")
	private String currency = "INR";

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private AccountType type;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private AccountStatus status = AccountStatus.PENDING;

	@Version
	private long version;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected Account() {
	}

	public Account(User owner, AccountType type, String accountNumber, String currency) {
		this.owner = owner;
		this.type = type;
		this.accountNumber = accountNumber;
		this.currency = currency;
	}

	public void debit(BigDecimal amount) {
		requireActive();
		requirePositive(amount);
		if (balance.compareTo(amount) < 0)
			throw new InsufficientBalanceException("Balance " + balance + " < requested " + amount);
		this.balance = balance.subtract(amount);
	}

	public void credit(BigDecimal amount) {
		requireActive();
		requirePositive(amount);
		this.balance = balance.add(amount);
	}

	public void freeze() {
	    if (status == AccountStatus.CLOSED)
	        throw new IllegalStateException("Cannot freeze a closed account");
	    if (status == AccountStatus.FROZEN) return;     // idempotent
	    if (status != AccountStatus.ACTIVE)
	        throw new IllegalStateException("Cannot freeze account in state " + status);
	    this.status = AccountStatus.FROZEN;
	}

	public void unfreeze() {
	    if (status != AccountStatus.FROZEN)
	        throw new IllegalStateException("Account is not frozen");
	    this.status = AccountStatus.ACTIVE;
	}

	public void close() {
	    if (status == AccountStatus.CLOSED) return;
	    if (balance.signum() != 0)
	        throw new IllegalStateException("Cannot close account with non-zero balance");
	    this.status = AccountStatus.CLOSED;
	}

	private void requireActive() {
		if (status != AccountStatus.ACTIVE)
			throw new AccountFrozenException("Account is " + status);
	}

	private void requirePositive(BigDecimal amount) {
		if (amount == null || amount.signum() <= 0)
			throw new IllegalArgumentException("Amount must be positive");
	}

	public UUID getId() {
		return id;
	}

	public String getAccountNumber() {
		return accountNumber;
	}

	public User getOwner() {
		return owner;
	}

	public BigDecimal getBalance() {
		return balance;
	}

	public String getCurrency() {
		return currency;
	}

	public AccountType getType() {
		return type;
	}

	public AccountStatus getStatus() {
		return status;
	}

	public long getVersion() {
		return version;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public boolean isActive() {
	    return status == AccountStatus.ACTIVE;
	}

	public void setBalance(BigDecimal subtract) {
		// TODO Auto-generated method stub
		
	}

}
