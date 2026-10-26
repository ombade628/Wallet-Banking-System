package com.bank.banking.model.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record TransactionResponse(
		String reference, 
		String accountNumber,
		BigDecimal amount,
		BigDecimal newBalance,
		String type,
		Instant timestamp) {

}
