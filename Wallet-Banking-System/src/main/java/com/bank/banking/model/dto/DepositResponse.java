package com.bank.banking.model.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record DepositResponse(
    String reference,
    String accountNumber,
    String holderName,
    BigDecimal amount,
    BigDecimal newBalance,
    String type,
    Instant timestamp
) {}