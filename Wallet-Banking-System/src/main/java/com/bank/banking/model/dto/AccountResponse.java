package com.bank.banking.model.dto;

import com.bank.banking.model.entity.Account;
import com.bank.banking.model.entity.AccountStatus;
import com.bank.banking.model.entity.AccountType;

import java.math.BigDecimal;
import java.util.UUID;

public record AccountResponse(
    UUID id,
    String accountNumber,
    BigDecimal balance,
    String currency,
    AccountType type,
    AccountStatus status
) {
    public static AccountResponse from(Account a) {
        return new AccountResponse(a.getId(), a.getAccountNumber(), a.getBalance(),
                                   a.getCurrency(), a.getType(), a.getStatus());
    }
}