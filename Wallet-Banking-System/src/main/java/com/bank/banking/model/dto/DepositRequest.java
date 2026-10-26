package com.bank.banking.model.dto;

import jakarta.validation.constraints.NotBlank;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record DepositRequest(
		@NotBlank 
		String accountNumber,
		
		@NotNull
		@Positive
		BigDecimal amount,
		String note) {
		
}
