package com.bank.banking.model.dto;

import com.bank.banking.model.entity.Transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransferResponse(
    UUID transactionId,
    String requestId,
    UUID fromAccountId,
    UUID toAccountId,
    BigDecimal amount,
    String currency,
    Instant createdAt
) {
    public static TransferResponse from(Transaction t) {
        return new TransferResponse(
            t.getId(),
            t.getRequestId(),
            t.getFromAccount().getId(),
            t.getToAccount().getId(),
            t.getAmount(),
            t.getCurrency(),
            t.getCreatedAt()
        );
    }
}