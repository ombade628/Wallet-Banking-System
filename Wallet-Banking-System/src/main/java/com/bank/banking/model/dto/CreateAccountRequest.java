package com.bank.banking.model.dto;

import com.bank.banking.model.entity.AccountType;
import jakarta.validation.constraints.NotNull;

public record CreateAccountRequest(
    @NotNull AccountType type,
    String currency
) {}