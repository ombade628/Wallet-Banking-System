package com.bank.banking.model.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record TransferRequest(
    @NotBlank 
    String requestId,
    
    @NotNull 
    UUID fromAccountId,
    
    @NotNull 
    UUID toAccountId,
    
    @NotNull 
    @DecimalMin(value = "0.01") 
    BigDecimal amount
) 

{
	
}