package com.bank.banking.model.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record WithdrawRequest(
		@NotBlank
		String accountNumber , 
		
		@NotNull
		@Positive
		BigDecimal amount, 
		
		String note) {

}
