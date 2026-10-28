package com.bank.banking.model.dto;

import com.bank.banking.model.entity.Transaction;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionView(
        UUID id, String requestId,
        UUID fromAccountId, String fromAccountNumber,
        UUID toAccountId, String toAccountNumber,
        BigDecimal amount, String currency, Instant createdAt) {

    public static TransactionView from(Transaction t) {
        return new TransactionView(
                t.getId(), t.getRequestId(),
                t.getFromAccount() != null ? t.getFromAccount().getId() : null,
                t.getFromAccount() != null ? t.getFromAccount().getAccountNumber() : null,
                t.getToAccount() != null ? t.getToAccount().getId() : null,
                t.getToAccount() != null ? t.getToAccount().getAccountNumber() : null,
                t.getAmount(), t.getCurrency(), t.getCreatedAt());
    }
}